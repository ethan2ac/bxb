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
  const validStatus = statusFilter && ['present', 'absent', 'late', 'excused'].includes(statusFilter);

  // The date column is aliased to `session_date` to keep the existing
  // frontend field name working unchanged.
  let query = `
    SELECT ear.id, ear.student_id, ear.status, ear.check_in_timestamp, ear.notes, ear.created_at, ear.updated_at,
      e.event_date as session_date, e.start_time as start_time, 'event' as source, e.name as occurrence_name
    FROM event_attendance_records ear
    JOIN events e ON e.id = ear.event_id
    WHERE ear.student_id = ?
  `;
  const bindings: unknown[] = [studentId];

  if (from) {
    query += ' AND e.event_date >= ?';
    bindings.push(from);
  }
  if (to) {
    query += ' AND e.event_date <= ?';
    bindings.push(to);
  }
  if (validStatus) {
    query += ' AND ear.status = ?';
    bindings.push(statusFilter);
  }
  query += ' ORDER BY session_date DESC';

  const records = await env.DB.prepare(query)
    .bind(...bindings)
    .all();

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
