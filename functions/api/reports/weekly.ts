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
  const group = url.searchParams.get('group');

  const sessions = await env.DB.prepare(
    'SELECT * FROM sessions ORDER BY session_date DESC LIMIT ?',
  )
    .bind(limit)
    .all();

  const studentCountQuery = group
    ? 'SELECT COUNT(*) as count FROM students WHERE active = 1 AND group_name = ?'
    : 'SELECT COUNT(*) as count FROM students WHERE active = 1';
  const activeStudentCount = await env.DB.prepare(studentCountQuery)
    .bind(...(group ? [group] : []))
    .first<{ count: number }>();

  const enrolled = activeStudentCount?.count || 0;

  const weeks = [];
  for (const session of sessions.results || []) {
    const sessionId = session.id as string;
    const statsQuery = group
      ? `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late,
           SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END) as excused
         FROM attendance_records ar
         JOIN students st ON st.id = ar.student_id
         WHERE ar.session_id = ? AND st.group_name = ?`
      : `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
         FROM attendance_records
         WHERE session_id = ?`;
    const stats = await env.DB.prepare(statsQuery)
      .bind(...(group ? [sessionId, group] : [sessionId]))
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
