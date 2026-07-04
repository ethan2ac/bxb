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

  const query = group
    ? `SELECT
         substr(s.session_date, 1, 7) as month,
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
       ORDER BY month DESC
       LIMIT ?`
    : `SELECT
         substr(s.session_date, 1, 7) as month,
         SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late,
         SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent,
         SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END) as excused,
         COUNT(*) as total
       FROM attendance_records ar
       JOIN sessions s ON s.id = ar.session_id
       GROUP BY month
       ORDER BY month DESC
       LIMIT ?`;

  const rows = await env.DB.prepare(query)
    .bind(...(group ? [group, months] : [months]))
    .all<MonthRow>();

  const trend = (rows.results || [])
    .map((row) => {
      const countable = row.total - row.excused;
      return {
        month: row.month,
        present: row.present,
        late: row.late,
        absent: row.absent,
        excused: row.excused,
        total: row.total,
        attendance_rate: countable > 0 ? Math.round(((row.present + row.late) / countable) * 100) : 0,
      };
    })
    .reverse();

  return success(trend);
};
