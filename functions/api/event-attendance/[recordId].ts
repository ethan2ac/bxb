import { success, badRequest, notFound } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateAttendanceStatus } from '../_shared/validation';
import { now, computeAttendanceStatus } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const recordId = params.recordId as string;
  const record = await env.DB.prepare('SELECT * FROM event_attendance_records WHERE id = ?')
    .bind(recordId)
    .first<{ id: string; event_id: string }>();

  if (!record) return notFound('Event attendance record not found');

  const body = await request.json<{
    status?: string;
    check_in_timestamp?: string | null;
    notes?: string | null;
  }>();

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(record.event_id)
    .first<{ start_time: string; late_threshold_minutes: number }>();

  if (!event) return notFound('Associated event not found');

  let status = body.status;
  if (body.check_in_timestamp && status !== 'absent' && status !== 'excused') {
    status = computeAttendanceStatus(
      body.check_in_timestamp,
      event.start_time,
      event.late_threshold_minutes,
    );
  }

  if (status && !validateAttendanceStatus(status)) {
    return badRequest('Invalid status. Must be present, absent, late, or excused');
  }

  const checkIn = status === 'absent' || status === 'excused' ? null : (body.check_in_timestamp ?? null);

  await env.DB.prepare(
    `UPDATE event_attendance_records
     SET status = COALESCE(?, status),
         check_in_timestamp = ?,
         notes = COALESCE(?, notes),
         updated_at = ?
     WHERE id = ?`,
  )
    .bind(status || null, checkIn, body.notes ?? null, now(), recordId)
    .run();

  const updated = await env.DB.prepare(
    `SELECT ear.*, s.english_name || CASE WHEN s.chinese_name IS NOT NULL AND s.chinese_name != '' THEN '/' || s.chinese_name ELSE '' END as student_name
     FROM event_attendance_records ear
     JOIN students s ON s.id = ear.student_id
     WHERE ear.id = ?`,
  )
    .bind(recordId)
    .first();

  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'event_attendance_record',
    entityId: recordId,
    action: 'update',
    metadata: { status },
  });

  return success(updated);
};
