import { success } from '../_shared/response';
import { requireAuth } from '../_shared/auth';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

interface MonthRow {
  month: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const months = Math.min(parseInt(url.searchParams.get('months') || '6', 10), 24);
  const group = url.searchParams.get('group');

  // Combines the legacy (sessions/attendance_records) and newer
  // (events/event_attendance_records) attendance systems — both are unioned
  // here so the trend reflects everything regardless of which system a
  // given month's attendance was recorded through.
  const query = group
    ? `SELECT month,
         SUM(present) as present, SUM(late) as late, SUM(absent) as absent, SUM(excused) as excused, SUM(total) as total
       FROM (
         SELECT substr(s.session_date, 1, 7) as month,
           SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late,
           SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END) as excused,
           COUNT(*) as total
         FROM attendance_records ar
         JOIN sessions s ON s.id = ar.session_id
         JOIN students st ON st.id = ar.student_id
         WHERE st.group_name = ?
         GROUP BY month
         UNION ALL
         SELECT substr(e.event_date, 1, 7) as month,
           SUM(CASE WHEN ear.status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN ear.status = 'late' THEN 1 ELSE 0 END) as late,
           SUM(CASE WHEN ear.status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN ear.status = 'excused' THEN 1 ELSE 0 END) as excused,
           COUNT(*) as total
         FROM event_attendance_records ear
         JOIN events e ON e.id = ear.event_id
         JOIN students st ON st.id = ear.student_id
         WHERE st.group_name = ?
         GROUP BY month
       )
       GROUP BY month
       ORDER BY month DESC
       LIMIT ?`
    : `SELECT month,
         SUM(present) as present, SUM(late) as late, SUM(absent) as absent, SUM(excused) as excused, SUM(total) as total
       FROM (
         SELECT substr(s.session_date, 1, 7) as month,
           SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late,
           SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END) as excused,
           COUNT(*) as total
         FROM attendance_records ar
         JOIN sessions s ON s.id = ar.session_id
         GROUP BY month
         UNION ALL
         SELECT substr(e.event_date, 1, 7) as month,
           SUM(CASE WHEN ear.status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN ear.status = 'late' THEN 1 ELSE 0 END) as late,
           SUM(CASE WHEN ear.status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN ear.status = 'excused' THEN 1 ELSE 0 END) as excused,
           COUNT(*) as total
         FROM event_attendance_records ear
         JOIN events e ON e.id = ear.event_id
         GROUP BY month
       )
       GROUP BY month
       ORDER BY month DESC
       LIMIT ?`;

  const rows = await env.DB.prepare(query)
    .bind(...(group ? [group, group, months] : [months]))
    .all<MonthRow>();

  const trend = (rows.results || [])
    .map((row) => ({
      month: row.month,
      present: row.present,
      late: row.late,
      absent: row.absent,
      excused: row.excused,
      total: row.total,
      // Excused counts against the rate the same as absent — not excluded
      // from the denominator — so this stays consistent with weekly.ts.
      attendance_rate: row.total > 0 ? Math.round(((row.present + row.late) / row.total) * 100) : 0,
    }))
    .reverse();

  return success(trend);
};
