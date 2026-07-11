import { success, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateAttendanceStatus } from '../_shared/validation';
import { generateId, now, computeAttendanceStatus } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

interface EventAttendanceEntry {
  student_id: string;
  status: string;
  check_in_timestamp?: string | null;
  notes?: string | null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await request.json<{
    event_id: string;
    records: EventAttendanceEntry[];
  }>();

  if (!body.event_id) return badRequest('event_id is required');
  if (!Array.isArray(body.records) || body.records.length === 0) {
    return badRequest('records array is required and must not be empty');
  }

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(body.event_id)
    .first<{ id: string; event_date: string; start_time: string; late_threshold_minutes: number }>();

  if (!event) return badRequest('Event not found');

  // The day-of attendance flow only ever writes today's (or a future) event —
  // once an event's date has passed, this bulk endpoint refuses the write so
  // a stray re-save can't silently clobber finalized history. Corrections to
  // a past event go through the single-record amend endpoint instead, which
  // requires a reason and leaves an audit trail.
  const today = new Date().toISOString().split('T')[0];
  if (event.event_date < today) {
    return badRequest('This event has already happened. Use Amend on its History page to make changes.');
  }

  const timestamp = now();
  const statements: D1PreparedStatement[] = [];

  for (const entry of body.records) {
    if (!entry.student_id) continue;

    const studentExists = await env.DB.prepare('SELECT id FROM students WHERE id = ?')
      .bind(entry.student_id)
      .first();
    if (!studentExists) continue;

    let status = entry.status;
    if (entry.check_in_timestamp && status !== 'absent' && status !== 'excused') {
      status = computeAttendanceStatus(
        entry.check_in_timestamp,
        event.start_time,
        event.late_threshold_minutes,
      );
    }

    if (!validateAttendanceStatus(status)) {
      status = 'absent';
    }

    const checkIn = status === 'absent' || status === 'excused' ? null : (entry.check_in_timestamp || null);

    statements.push(
      env.DB.prepare(
        `INSERT INTO event_attendance_records (id, student_id, event_id, status, check_in_timestamp, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id, event_id) DO UPDATE SET
           status = excluded.status,
           check_in_timestamp = excluded.check_in_timestamp,
           notes = excluded.notes,
           updated_at = excluded.updated_at`,
      ).bind(
        generateId('eatt'),
        entry.student_id,
        body.event_id,
        status,
        checkIn,
        entry.notes || null,
        timestamp,
        timestamp,
      ),
    );
  }

  if (statements.length > 0) {
    await env.DB.batch(statements);
    await logAudit(env.DB, {
      actorUserId: auth.id,
      entityType: 'event',
      entityId: body.event_id,
      action: 'attendance_save',
      metadata: { recordCount: statements.length },
    });
  }

  const records = await env.DB.prepare(
    `SELECT ear.*, s.english_name || CASE WHEN s.chinese_name IS NOT NULL AND s.chinese_name != '' THEN '/' || s.chinese_name ELSE '' END as student_name
     FROM event_attendance_records ear
     JOIN students s ON s.id = ear.student_id
     WHERE ear.event_id = ?
     ORDER BY s.english_name ASC`,
  )
    .bind(body.event_id)
    .all();

  return success({ event, records: records.results });
};
