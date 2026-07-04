import { success, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const eventId = url.searchParams.get('eventId');

  if (!eventId) {
    return badRequest('eventId query parameter is required');
  }

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first();

  if (!event) {
    return success({ event: null, records: [] });
  }

  const records = await env.DB.prepare(
    `SELECT ear.*, s.english_name || CASE WHEN s.chinese_name IS NOT NULL AND s.chinese_name != '' THEN '/' || s.chinese_name ELSE '' END as student_name
     FROM event_attendance_records ear
     JOIN students s ON s.id = ear.student_id
     WHERE ear.event_id = ?
     ORDER BY s.english_name ASC`,
  )
    .bind(eventId)
    .all();

  return success({ event, records: records.results });
};
