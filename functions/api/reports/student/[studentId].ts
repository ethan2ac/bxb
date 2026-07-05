import { success, notFound } from '../../_shared/response';
import { requireAuth } from '../../_shared/auth';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const studentId = params.studentId as string;
  const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?')
    .bind(studentId)
    .first();
  if (!student) return notFound('Student not found');

  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const statusFilter = url.searchParams.get('status');

  let query = `
    SELECT ar.*, s.session_date, s.start_time
    FROM attendance_records ar
    JOIN sessions s ON s.id = ar.session_id
    WHERE ar.student_id = ?
  `;
  const bindings: unknown[] = [studentId];

  if (from) {
    query += ' AND s.session_date >= ?';
    bindings.push(from);
  }
  if (to) {
    query += ' AND s.session_date <= ?';
    bindings.push(to);
  }
  if (statusFilter && ['present', 'absent', 'late', 'excused'].includes(statusFilter)) {
    query += ' AND ar.status = ?';
    bindings.push(statusFilter);
  }

  query += ' ORDER BY s.session_date DESC';

  const stmt = env.DB.prepare(query);
  const records = await stmt.bind(...bindings).all();

  const total = records.results?.length || 0;
  const present = records.results?.filter((r) => r.status === 'present').length || 0;
  const late = records.results?.filter((r) => r.status === 'late').length || 0;
  const absent = records.results?.filter((r) => r.status === 'absent').length || 0;
  const excused = records.results?.filter((r) => r.status === 'excused').length || 0;

  return success({
    student,
    records: records.results,
    summary: {
      total,
      present,
      late,
      absent,
      excused,
      // Excused counts against the rate the same as absent, consistent with
      // the weekly/monthly report endpoints.
      attendance_rate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
    },
  });
};
