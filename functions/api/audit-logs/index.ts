import { success } from '../_shared/response';
import { requireAuth } from '../_shared/auth';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

  const logs = await env.DB.prepare(
    `SELECT al.*, u.name as actor_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     ORDER BY al.created_at DESC
     LIMIT ?`,
  )
    .bind(limit)
    .all();

  return success(logs.results);
};
