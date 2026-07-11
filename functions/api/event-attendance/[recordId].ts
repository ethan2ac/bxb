import { success, badRequest, notFound } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateAttendanceStatus, isNonEmptyString } from '../_shared/validation';
import { now } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

// This endpoint has one purpose: amend an already-recorded attendance status
// after the fact, with a mandatory reason. It is not used by the day-of
// attendance-taking flow (that's the bulk /save endpoint, which refuses to
// touch events that have already happened) — so every call here represents a
// deliberate correction and must explain itself.
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const recordId = params.recordId as string;
  const record = await env.DB.prepare('SELECT * FROM event_attendance_records WHERE id = ?')
    .bind(recordId)
    .first<{ id: string; event_id: string; status: string; notes: string | null }>();

  if (!record) return notFound('Event attendance record not found');

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
    `UPDATE event_attendance_records SET status = ?, notes = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(body.status, notes, now(), recordId)
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
    action: 'amend',
    metadata: { previous_status: previousStatus, new_status: body.status, reason },
  });

  return success(updated);
};
