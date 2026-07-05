import { success, badRequest, unauthorized, conflict } from '../_shared/response';
import { hashPassword, createSessionToken, sessionCookie } from '../_shared/crypto';
import { getSecret } from '../_shared/auth';
import { generateId, now } from '../_shared/db';
import { logAudit } from '../_shared/audit';
import { isNonEmptyString } from '../_shared/validation';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
  REGISTER_INVITE_CODE?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<Record<string, unknown>>();

  if (!env.REGISTER_INVITE_CODE || body.inviteCode !== env.REGISTER_INVITE_CODE) {
    return unauthorized('Invalid invite code');
  }
  if (!isNonEmptyString(body.username)) return badRequest('Username is required');
  if (!isNonEmptyString(body.password) || (body.password as string).length < 6) {
    return badRequest('Password must be at least 6 characters');
  }

  const username = (body.username as string).trim();
  const id = generateId('usr');
  const timestamp = now();
  const passwordHash = await hashPassword(body.password as string);

  try {
    await env.DB.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', 1, ?, ?)`,
    )
      .bind(id, username, username.toLowerCase(), passwordHash, timestamp, timestamp)
      .run();
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      return conflict('That username is already taken');
    }
    throw e;
  }

  await logAudit(env.DB, {
    actorUserId: id,
    entityType: 'user',
    entityId: id,
    action: 'register',
    metadata: { username },
  });

  const token = await createSessionToken(id, getSecret(env));
  const cookie = sessionCookie(token, 7 * 24 * 60 * 60);
  const response = success({ user: { id, name: username, email: username.toLowerCase(), role: 'admin' } });
  response.headers.set('Set-Cookie', cookie);
  return response;
};
