import { success } from '../_shared/response';
import { requireOwner } from '../_shared/auth';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireOwner(request, env);
  if (auth instanceof Response) return auth;

  const result = await env.DB.prepare(
    'SELECT id, name, email, role, active, created_at FROM users WHERE active = 1 ORDER BY created_at ASC',
  ).all();
  return success(result.results);
};
