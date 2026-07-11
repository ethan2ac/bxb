import { success, badRequest, notFound } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateAttendanceStatus, isNonEmptyString } from '../_shared/validation';
import { now } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

// Same amend-only contract as functions/api/event-attendance/[recordId].ts —
// see that file's comment. This is the equivalent endpoint for legacy
// (imported historical) session attendance records.
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const recordId = params.recordId as string;
  const record = await env.DB.prepare('SELECT * FROM attendance_records WHERE id = ?')
    .bind(recordId)
    .first<{ id: string; session_id: string; status: string; notes: string | null }>();

  if (!record) return notFound('Attendance record not found');

  const body = await request.json<{ status?: string; reason?: string }>();

  if (!validateAttendanceStatus(body.status)) {
    return badRequest('Invalid status. Must be present, absent, late, or excused');
  }
  if (!isNonEmptyString(body.reason)) {
    return badRequest('A reason is required to amend attendance');
  }

  const previousStatus = record.status;
  const reason = body.reason.trim();
  const amendmentNote = `Amended from ${previousStatus} to ${body.status}: ${reason}`;
  const notes = record.notes ? `${record.notes}\n${amendmentNote}` : amendmentNote;

  await env.DB.prepare(
    `UPDATE attendance_records SET status = ?, notes = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(body.status, notes, now(), recordId)
    .run();

  const updated = await env.DB.prepare(
    `SELECT ar.*, s.english_name || CASE WHEN s.chinese_name IS NOT NULL AND s.chinese_name != '' THEN '/' || s.chinese_name ELSE '' END as student_name
     FROM attendance_records ar
     JOIN students s ON s.id = ar.student_id
     WHERE ar.id = ?`,
  )
    .bind(recordId)
    .first();

  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'attendance_record',
    entityId: recordId,
    action: 'amend',
    metadata: { previous_status: previousStatus, new_status: body.status, reason },
  });

  return success(updated);
};
