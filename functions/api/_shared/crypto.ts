const ITERATIONS = 100000;
const KEY_LENGTH = 32;

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
  return bufToHex(new Uint8Array(hashBuffer)) === expectedHex;
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
    ['sign'],
  );
  const expectedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  if (bufToHex(new Uint8Array(expectedSig)) !== sigHex) return null;
  return { userId };
}

export function sessionCookie(token: string, maxAge: number): string {
  return `pyb_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}
