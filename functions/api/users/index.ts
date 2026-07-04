import { success, created, badRequest, conflict } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { hashPassword } from '../_shared/crypto';
import { generateId, now } from '../_shared/db';
import { logAudit } from '../_shared/audit';
import { isNonEmptyString } from '../_shared/validation';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const result = await env.DB.prepare(
    'SELECT id, name, email, role, active, created_at FROM users WHERE active = 1 ORDER BY created_at ASC',
  ).all();
  return success(result.results);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await request.json<Record<string, unknown>>();
  if (!isNonEmptyString(body.name)) return badRequest('Name is required');
  if (!isNonEmptyString(body.email) || !EMAIL_RE.test((body.email as string).trim())) {
    return badRequest('A valid email is required');
  }
  if (!isNonEmptyString(body.password) || (body.password as string).length < 6) {
    return badRequest('Password must be at least 6 characters');
  }

  const id = generateId('usr');
  const timestamp = now();
  const passwordHash = await hashPassword(body.password as string);

  try {
    await env.DB.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', 1, ?, ?)`,
    )
      .bind(id, (body.name as string).trim(), (body.email as string).trim().toLowerCase(), passwordHash, timestamp, timestamp)
      .run();
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      return conflict('Email already in use');
    }
    throw e;
  }

  const user = await env.DB.prepare(
    'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?',
  )
    .bind(id)
    .first();

  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'user',
    entityId: id,
    action: 'create',
    metadata: { name: body.name, email: body.email },
  });

  return created(user);
};
