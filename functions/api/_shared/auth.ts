import { unauthorized, forbidden } from './response';
import { verifySessionToken } from './crypto';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// No hardcoded fallback: a default secret committed to source would let
// anyone forge session tokens on any deployment that's missing the real
// one (e.g. a preview environment sharing the production D1 database).
// Failing closed here means a misconfigured environment can't serve
// requests at all rather than silently authenticating as anyone.
export function getSecret(env: Env): string {
  if (!env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not configured for this environment');
  }
  return env.SESSION_SECRET;
}

function parseCookies(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  header.split(';').forEach((pair) => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  });
  return cookies;
}

export async function getAuthUser(request: Request, env: Env): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  const token = cookies['pyb_session'];
  if (!token) return null;
  const session = await verifySessionToken(token, getSecret(env));
  if (!session) return null;
  const user = await env.DB.prepare(
    'SELECT id, name, email, role FROM users WHERE id = ? AND active = 1',
  )
    .bind(session.userId)
    .first<AuthUser>();
  return user || null;
}

export async function requireAuth(request: Request, env: Env): Promise<AuthUser | Response> {
  const user = await getAuthUser(request, env);
  if (!user) return unauthorized();
  return user;
}

export async function requireOwner(request: Request, env: Env): Promise<AuthUser | Response> {
  const user = await getAuthUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return forbidden('Only the owner account can manage users');
  return user;
}
