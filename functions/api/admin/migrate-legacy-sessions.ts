import { success, badRequest } from '../_shared/response';
import { requireOwner } from '../_shared/auth';
import { generateId } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

interface LegacySession {
  id: string;
  session_date: string;
}

interface LegacyAttendanceRecord {
  student_id: string;
  status: string;
  check_in_timestamp: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// One-time cleanup for the pre-"events" attendance system. For each legacy
// `sessions` row, folds its `attendance_records` into the real `events` row
// on the same date (there should be exactly one — if there's zero or more
// than one, that session is left untouched and reported rather than guessed
// at). ON CONFLICT DO NOTHING means it can never clobber attendance someone
// already entered through the current UI. Safe to run more than once.
//
// Temporary: remove this route once run against production.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireOwner(request, env);
  if (auth instanceof Response) return auth;

  const sessions = await env.DB.prepare('SELECT id, session_date FROM sessions').all<LegacySession>();
  const results: Array<{
    session_id: string;
    date: string;
    migrated: boolean;
    event_id?: string;
    recordCount?: number;
    reason?: string;
  }> = [];

  for (const session of sessions.results || []) {
    const matchingEvents = await env.DB.prepare('SELECT id FROM events WHERE event_date = ?')
      .bind(session.session_date)
      .all<{ id: string }>();

    if (matchingEvents.results.length !== 1) {
      results.push({
        session_id: session.id,
        date: session.session_date,
        migrated: false,
        reason: `Found ${matchingEvents.results.length} events on this date, expected exactly 1 — left untouched`,
      });
      continue;
    }

    const eventId = matchingEvents.results[0].id;
    const records = await env.DB.prepare(
      'SELECT student_id, status, check_in_timestamp, notes, created_at, updated_at FROM attendance_records WHERE session_id = ?',
    )
      .bind(session.id)
      .all<LegacyAttendanceRecord>();

    const statements = (records.results || []).map((r) =>
      env.DB.prepare(
        `INSERT INTO event_attendance_records (id, student_id, event_id, status, check_in_timestamp, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id, event_id) DO NOTHING`,
      ).bind(
        generateId('eatt'),
        r.student_id,
        eventId,
        r.status,
        r.check_in_timestamp,
        r.notes,
        r.created_at,
        r.updated_at,
      ),
    );

    if (statements.length > 0) await env.DB.batch(statements);
    await env.DB.prepare('DELETE FROM attendance_records WHERE session_id = ?').bind(session.id).run();
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();

    results.push({
      session_id: session.id,
      date: session.session_date,
      migrated: true,
      event_id: eventId,
      recordCount: statements.length,
    });
  }

  const remaining = await env.DB.prepare('SELECT COUNT(*) as c FROM sessions').first<{ c: number }>();
  if ((remaining?.c || 0) > 0 && results.every((r) => r.migrated)) {
    // Shouldn't happen given the loop above, but fail loudly rather than
    // silently reporting success if it ever does.
    return badRequest('Some sessions remain after migration despite all being reported as migrated');
  }

  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'system',
    entityId: 'legacy-sessions-migration',
    action: 'migrate',
    metadata: { results },
  });

  return success({ results, remainingLegacySessions: remaining?.c || 0 });
};
