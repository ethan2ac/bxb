// Current OWASP guidance for PBKDF2-SHA256 is 600,000+ iterations, but this
// runs on Cloudflare's "Bundled" Workers usage model, which enforces a
// ~50ms CPU-time budget per request — measured locally, 600,000 iterations
// takes ~140ms (vs ~25ms for 100,000), reliably exceeding that budget and
// crashing every registration/password-reset with a mid-request CPU-limit
// termination. 100,000 keeps a comfortable safety margin under the limit.
// The stored hash format ("iterations:salt:hash") is self-describing —
// verifyPassword reads the iteration count back out of the stored hash, so
// this doesn't affect already-hashed passwords either way.
const ITERATIONS = 100000;
const KEY_LENGTH = 32;

// Plain === / !== on secrets leaks how many leading characters matched via
// response timing. This compares every character regardless of where the
// first mismatch is, so equal-length secrets take the same time to reject.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  const saltHex = bufToHex(salt);
  const hashHex = bufToHex(new Uint8Array(hashBuffer));
  return `${ITERATIONS}:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [iterStr, saltHex, expectedHex] = stored.split(':');
  const iterations = parseInt(iterStr, 10);
  const salt = hexToBuf(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  return timingSafeEqual(bufToHex(new Uint8Array(hashBuffer)), expectedHex);
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSessionToken(userId: string, secret: string): Promise<string> {
  const expires = Date.now() + SESSION_DURATION_MS;
  const payload = `${userId}:${expires}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}:${bufToHex(new Uint8Array(sig))}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<{ userId: string } | null> {
  const parts = token.split(':');
  if (parts.length !== 3) return null;
  const [userId, expiresStr, sigHex] = parts;
  const expires = parseInt(expiresStr, 10);
  if (Date.now() > expires) return null;
  const payload = `${userId}:${expiresStr}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  // subtle.verify is a constant-time comparison by design — preferred over
  // re-signing and comparing hex strings with ===.
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    hexToBuf(sigHex),
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;
  return { userId };
}

export function sessionCookie(token: string, maxAge: number): string {
  return `pyb_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
