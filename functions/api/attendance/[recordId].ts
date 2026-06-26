import { success, badRequest, notFound } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateAttendanceStatus } from '../_shared/validation';
import { now, computeAttendanceStatus } from '../_shared/db';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const recordId = params.recordId as string;
  const record = await env.DB.prepare('SELECT * FROM attendance_records WHERE id = ?')
    .bind(recordId)
    .first<{ id: string; session_id: string }>();

  if (!record) return notFound('Attendance record not found');

  const body = await request.json<{
    status?: string;
    check_in_timestamp?: string | null;
    notes?: string | null;
  }>();

  const session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(record.session_id)
    .first<{ start_time: string; late_threshold_minutes: number }>();

  if (!session) return notFound('Associated session not found');

  let status = body.status;
  if (body.check_in_timestamp && status !== 'absent') {
    status = computeAttendanceStatus(
      body.check_in_timestamp,
      session.start_time,
      session.late_threshold_minutes,
    );
  }

  if (status && !validateAttendanceStatus(status)) {
    return badRequest('Invalid status. Must be present, absent, or late');
  }

  const checkIn = status === 'absent' ? null : (body.check_in_timestamp ?? null);

  await env.DB.prepare(
    `UPDATE attendance_records
     SET status = COALESCE(?, status),
         check_in_timestamp = ?,
         notes = COALESCE(?, notes),
         updated_at = ?
     WHERE id = ?`,
  )
    .bind(status || null, checkIn, body.notes ?? null, now(), recordId)
    .run();

  const updated = await env.DB.prepare(
    `SELECT ar.*, s.name as student_name
     FROM attendance_records ar
     JOIN students s ON s.id = ar.student_id
     WHERE ar.id = ?`,
  )
    .bind(recordId)
    .first();

  return success(updated);
};
