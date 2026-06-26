import { success, notFound } from '../_shared/response';
import { requireAuth } from '../_shared/auth';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(params.id as string)
    .first();
  if (!session) return notFound('Session not found');
  return success(session);
};
