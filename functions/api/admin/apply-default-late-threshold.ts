import { success } from '../_shared/response';
import { requireOwner } from '../_shared/auth';
import { getSettings, getOrgTodayDate, computeAttendanceStatus, now } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

interface EventRow {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  late_threshold_minutes: number;
}

// One-time fix: events created before the New Event form honoured the
// Settings default were all saved with a hardcoded 15-minute late threshold.
// Sets every event from today onward to the current Settings default, and
// re-derives present/late for any check-ins already recorded on them (absent
// and excused are never touched). Past events are left alone. Safe to run
// more than once.
//
// Temporary: remove this route once run against production.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireOwner(request, env);
  if (auth instanceof Response) return auth;

  const settings = await getSettings(env.DB);
  const threshold = parseInt(settings.default_late_threshold_minutes, 10);
  const today = getOrgTodayDate();

  const events = await env.DB.prepare(
    'SELECT id, name, event_date, start_time, late_threshold_minutes FROM events WHERE event_date >= ? AND late_threshold_minutes != ? ORDER BY event_date',
  )
    .bind(today, threshold)
    .all<EventRow>();

  const timestamp = now();
  const updated: Array<{ id: string; date: string; name: string; from: number; recordsChanged: number }> = [];

  for (const event of events.results || []) {
    const records = await env.DB.prepare(
      "SELECT id, status, check_in_timestamp FROM event_attendance_records WHERE event_id = ? AND status IN ('present', 'late') AND check_in_timestamp IS NOT NULL",
    )
      .bind(event.id)
      .all<{ id: string; status: string; check_in_timestamp: string }>();

    const statements: D1PreparedStatement[] = [
      env.DB.prepare('UPDATE events SET late_threshold_minutes = ?, updated_at = ? WHERE id = ?').bind(
        threshold,
        timestamp,
        event.id,
      ),
    ];
    for (const r of records.results || []) {
      const status = computeAttendanceStatus(r.check_in_timestamp, event.start_time, event.event_date, threshold);
      if (status !== r.status) {
        statements.push(
          env.DB.prepare('UPDATE event_attendance_records SET status = ?, updated_at = ? WHERE id = ?').bind(
            status,
            timestamp,
            r.id,
          ),
        );
      }
    }
    await env.DB.batch(statements);

    updated.push({
      id: event.id,
      date: event.event_date,
      name: event.name,
      from: event.late_threshold_minutes,
      recordsChanged: statements.length - 1,
    });
  }

  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'system',
    entityId: 'apply-default-late-threshold',
    action: 'update',
    metadata: { threshold, updated },
  });

  return success({ threshold, eventsUpdated: updated.length, updated });
};
