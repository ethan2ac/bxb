import { success, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateAttendanceStatus } from '../_shared/validation';
import { generateId, now, computeAttendanceStatus } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

interface AttendanceEntry {
  student_id: string;
  status: string;
  check_in_timestamp?: string | null;
  notes?: string | null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await request.json<{
    session_id: string;
    records: AttendanceEntry[];
  }>();

  if (!body.session_id) return badRequest('session_id is required');
  if (!Array.isArray(body.records) || body.records.length === 0) {
    return badRequest('records array is required and must not be empty');
  }

  const session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(body.session_id)
    .first<{ id: string; start_time: string; late_threshold_minutes: number }>();

  if (!session) return badRequest('Session not found');

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
        session.start_time,
        session.late_threshold_minutes,
      );
    }

    if (!validateAttendanceStatus(status)) {
      status = 'absent';
    }

    const checkIn = status === 'absent' || status === 'excused' ? null : (entry.check_in_timestamp || null);

    statements.push(
      env.DB.prepare(
        `INSERT INTO attendance_records (id, student_id, session_id, status, check_in_timestamp, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id, session_id) DO UPDATE SET
           status = excluded.status,
           check_in_timestamp = excluded.check_in_timestamp,
           notes = excluded.notes,
           updated_at = excluded.updated_at`,
      ).bind(
        generateId('att'),
        entry.student_id,
        body.session_id,
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
      entityType: 'session',
      entityId: body.session_id,
      action: 'attendance_save',
      metadata: { recordCount: statements.length },
    });
  }

  const records = await env.DB.prepare(
    `SELECT ar.*, s.english_name || CASE WHEN s.chinese_name IS NOT NULL AND s.chinese_name != '' THEN '/' || s.chinese_name ELSE '' END as student_name
     FROM attendance_records ar
     JOIN students s ON s.id = ar.student_id
     WHERE ar.session_id = ?
     ORDER BY s.english_name ASC`,
  )
    .bind(body.session_id)
    .all();

  return success({ session, records: records.results });
};
