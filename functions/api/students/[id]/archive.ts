import { success, notFound } from '../../_shared/response';
import { requireAuth } from '../../_shared/auth';
import { now } from '../../_shared/db';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?')
    .bind(params.id as string)
    .first();
  if (!student) return notFound('Student not found');

  await env.DB.prepare('UPDATE students SET active = 0, updated_at = ? WHERE id = ?')
    .bind(now(), params.id as string)
    .run();

  const updated = await env.DB.prepare('SELECT * FROM students WHERE id = ?')
    .bind(params.id as string)
    .first();
  return success(updated);
};
