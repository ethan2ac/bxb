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
  const sessionDate = url.searchParams.get('sessionDate');
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionDate && !sessionId) {
    return badRequest('sessionDate or sessionId query parameter is required');
  }

  let session: Record<string, unknown> | null = null;
  if (sessionId) {
    session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?')
      .bind(sessionId)
      .first();
  } else if (sessionDate) {
    session = await env.DB.prepare('SELECT * FROM sessions WHERE session_date = ?')
      .bind(sessionDate)
      .first();
  }

  if (!session) {
    return success({ session: null, records: [] });
  }

  const records = await env.DB.prepare(
    `SELECT ar.*, s.name as student_name
     FROM attendance_records ar
     JOIN students s ON s.id = ar.student_id
     WHERE ar.session_id = ?
     ORDER BY s.name ASC`,
  )
    .bind(session.id as string)
    .all();

  return success({ session, records: records.results });
};
