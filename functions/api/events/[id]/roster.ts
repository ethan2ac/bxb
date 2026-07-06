import { success, notFound } from '../../_shared/response';
import { requireAuth } from '../../_shared/auth';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(params.id as string)
    .first<{ group_scope: string; restricted_roster: number }>();
  if (!event) return notFound('Event not found');

  if (event.restricted_roster) {
    const result = await env.DB.prepare(
      `SELECT s.* FROM students s
       JOIN event_invitees ei ON ei.student_id = s.id
       WHERE ei.event_id = ? AND s.active = 1
       ORDER BY s.english_name ASC`,
    )
      .bind(params.id as string)
      .all();
    return success(result.results);
  }

  const query =
    event.group_scope === 'BOTH'
      ? 'SELECT * FROM students WHERE active = 1 ORDER BY english_name ASC'
      : 'SELECT * FROM students WHERE active = 1 AND group_name = ? ORDER BY english_name ASC';
  const stmt = env.DB.prepare(query);
  const result = event.group_scope === 'BOTH' ? await stmt.all() : await stmt.bind(event.group_scope).all();
  return success(result.results);
};
