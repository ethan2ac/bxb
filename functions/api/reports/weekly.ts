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
  const today = new Date().toISOString().split('T')[0];

  // Exclude future-dated sessions: nothing has happened yet, so they should
  // never outrank today as the "latest" session under ORDER BY date DESC.
  const sessions = await env.DB.prepare(
    'SELECT * FROM sessions WHERE session_date <= ? ORDER BY session_date DESC LIMIT ?',
  )
    .bind(today, limit)
    .all();

  const byCount = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM students WHERE active = 1 AND group_name = 'BY'",
  ).first<{ count: number }>();
  const jdyCount = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM students WHERE active = 1 AND group_name = 'JDY'",
  ).first<{ count: number }>();
  const byEnrolled = byCount?.count || 0;
  const jdyEnrolled = jdyCount?.count || 0;

  const weeks = [];
  for (const session of sessions.results || []) {
    const sessionId = session.id as string;
    const sessionDate = session.session_date as string;

    // Without an explicit group filter, detect which group(s) the day's
    // scheduled event(s) actually cover instead of always averaging over the
    // full combined roster.
    let effectiveGroup = group;
    if (!effectiveGroup) {
      const dayEvents = await env.DB.prepare('SELECT group_scope FROM events WHERE event_date = ?')
        .bind(sessionDate)
        .all<{ group_scope: string }>();
      const scopes = new Set((dayEvents.results || []).map((e) => e.group_scope));
      if (scopes.size > 0 && !scopes.has('BOTH') && !(scopes.has('BY') && scopes.has('JDY'))) {
        effectiveGroup = scopes.has('JDY') ? 'JDY' : 'BY';
      }
    }

    const enrolled =
      effectiveGroup === 'BY' ? byEnrolled : effectiveGroup === 'JDY' ? jdyEnrolled : byEnrolled + jdyEnrolled;

    const statsQuery = effectiveGroup
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
      .bind(...(effectiveGroup ? [sessionId, effectiveGroup] : [sessionId]))
      .first<{ total: number; present: number; late: number; absent: number; excused: number }>();

    const total = stats?.total || 0;
    const present = stats?.present || 0;
    const late = stats?.late || 0;
    const absent = stats?.absent || 0;
    const excused = stats?.excused || 0;

    // Excused counts against the rate the same as absent (not excluded from
    // the denominator) so the rate/trend stays consistent with the raw
    // present+late+absent+excused breakdown shown elsewhere on the page.
    weeks.push({
      session,
      enrolled,
      present,
      late,
      absent,
      excused,
      total,
      attendance_rate: enrolled > 0 ? Math.round(((present + late) / enrolled) * 100) : 0,
    });
  }

  return success(weeks);
};
