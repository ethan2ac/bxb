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
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);

  const sessions = await env.DB.prepare(
    'SELECT * FROM sessions ORDER BY session_date DESC LIMIT ?',
  )
    .bind(limit)
    .all();

  const activeStudentCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM students WHERE active = 1',
  ).first<{ count: number }>();

  const enrolled = activeStudentCount?.count || 0;

  const weeks = [];
  for (const session of sessions.results || []) {
    const sessionId = session.id as string;
    const stats = await env.DB.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
         SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
       FROM attendance_records
       WHERE session_id = ?`,
    )
      .bind(sessionId)
      .first<{ total: number; present: number; late: number; absent: number; excused: number }>();

    const total = stats?.total || 0;
    const present = stats?.present || 0;
    const late = stats?.late || 0;
    const absent = stats?.absent || 0;
    const excused = stats?.excused || 0;
    const countable = enrolled - excused;

    weeks.push({
      session,
      enrolled,
      present,
      late,
      absent,
      excused,
      total,
      attendance_rate: countable > 0 ? Math.round(((present + late) / countable) * 100) : 0,
    });
  }

  return success(weeks);
};
