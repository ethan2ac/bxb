import { success, badRequest, notFound } from '../../_shared/response';
import { requireOwner } from '../../_shared/auth';
import { hashPassword } from '../../_shared/crypto';
import { now } from '../../_shared/db';
import { logAudit } from '../../_shared/audit';
import { isNonEmptyString } from '../../_shared/validation';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireOwner(request, env);
  if (auth instanceof Response) return auth;

  const userId = params.id as string;
  const target = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!target) return notFound('User not found');
  if (target.role === 'owner') return badRequest('Cannot reset the owner account from here');

  const body = await request.json<Record<string, unknown>>();
  if (!isNonEmptyString(body.password) || (body.password as string).length < 6) {
    return badRequest('Password must be at least 6 characters');
  }

  const passwordHash = await hashPassword(body.password as string);
  await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now(), userId)
    .run();

  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'user',
    entityId: userId,
    action: 'reset_password',
    metadata: { name: target.name },
  });

  return success({ id: userId });
};
