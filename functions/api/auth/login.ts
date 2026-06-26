import { success, badRequest, unauthorized } from '../_shared/response';
import { verifyPassword, createSessionToken, sessionCookie } from '../_shared/crypto';
import { getSecret } from '../_shared/auth';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{ email?: string; password?: string }>();
  if (!body.email || !body.password) {
    return badRequest('Email and password are required');
  }

  const user = await env.DB.prepare(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ? AND active = 1',
  )
    .bind(body.email.trim().toLowerCase())
    .first<{ id: string; name: string; email: string; password_hash: string; role: string }>();

  if (!user) return unauthorized('Invalid email or password');

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) return unauthorized('Invalid email or password');

  const token = await createSessionToken(user.id, getSecret(env));
  const cookie = sessionCookie(token, 7 * 24 * 60 * 60);

  const response = success({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
  response.headers.set('Set-Cookie', cookie);
  return response;
};
