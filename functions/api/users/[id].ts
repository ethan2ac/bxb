import { success, badRequest, notFound } from '../_shared/response';
import { requireOwner } from '../_shared/auth';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireOwner(request, env);
  if (auth instanceof Response) return auth;

  const userId = params.id as string;
  if (userId === auth.id) return badRequest('You cannot remove your own account');

  const target = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!target) return notFound('User not found');
  if (target.role === 'owner') return badRequest('Cannot remove the owner account');

  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'user',
    entityId: userId,
    action: 'delete',
    metadata: { name: target.name },
  });

  return success({ id: userId });
};
