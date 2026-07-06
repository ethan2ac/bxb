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

  // Combines the legacy (sessions/attendance_records) and newer
  // (events/event_attendance_records) attendance systems into one history —
  // aliasing both branches' date column to `session_date` keeps the existing
  // frontend field name working unchanged.
  let sessionBranch = `
    SELECT ar.id, ar.student_id, ar.status, ar.check_in_timestamp, ar.notes, ar.created_at, ar.updated_at,
      s.session_date as session_date, s.start_time as start_time, 'session' as source, NULL as occurrence_name
    FROM attendance_records ar
    JOIN sessions s ON s.id = ar.session_id
    WHERE ar.student_id = ?
  `;
  let eventBranch = `
    SELECT ear.id, ear.student_id, ear.status, ear.check_in_timestamp, ear.notes, ear.created_at, ear.updated_at,
      e.event_date as session_date, e.start_time as start_time, 'event' as source, e.name as occurrence_name
    FROM event_attendance_records ear
    JOIN events e ON e.id = ear.event_id
    WHERE ear.student_id = ?
  `;
  const sessionBindings: unknown[] = [studentId];
  const eventBindings: unknown[] = [studentId];

  if (from) {
    sessionBranch += ' AND s.session_date >= ?';
    eventBranch += ' AND e.event_date >= ?';
    sessionBindings.push(from);
    eventBindings.push(from);
  }
  if (to) {
    sessionBranch += ' AND s.session_date <= ?';
    eventBranch += ' AND e.event_date <= ?';
    sessionBindings.push(to);
    eventBindings.push(to);
  }
  if (validStatus) {
    sessionBranch += ' AND ar.status = ?';
    eventBranch += ' AND ear.status = ?';
    sessionBindings.push(statusFilter);
    eventBindings.push(statusFilter);
  }

  const query = `${sessionBranch} UNION ALL ${eventBranch} ORDER BY session_date DESC`;
  const records = await env.DB.prepare(query)
    .bind(...sessionBindings, ...eventBindings)
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
