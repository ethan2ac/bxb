import { success } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { getOrgTodayDate } from '../_shared/db';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

interface WeeklyRow {
  occurrence_type: 'event';
  occurrence_id: string;
  occurrence_date: string;
  occurrence_name: string | null;
  enrolled: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  attendance_rate: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const group = url.searchParams.get('group');
  const today = getOrgTodayDate();

  // Future-dated events are excluded: nothing has happened yet, so they
  // should never outrank today as the "latest" occurrence under DATE DESC.
  const weeks: WeeklyRow[] = [];

  // Events that have never had attendance taken are excluded — otherwise
  // every future/untouched event would show up as a zero-stat phantom row.
  let eventsQuery = `
    SELECT * FROM events e
    WHERE e.event_date <= ?
      AND EXISTS (SELECT 1 FROM event_attendance_records WHERE event_id = e.id)
  `;
  const eventsBindings: unknown[] = [today];
  if (group) {
    eventsQuery += " AND (e.group_scope = ? OR e.group_scope = 'BOTH')";
    eventsBindings.push(group);
  }
  eventsQuery += ' ORDER BY e.event_date DESC LIMIT ?';
  eventsBindings.push(limit);

  const events = await env.DB.prepare(eventsQuery).bind(...eventsBindings).all();

  for (const event of events.results || []) {
    const eventId = event.id as string;
    const statsQuery = group
      ? `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN ear.status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN ear.status = 'late' THEN 1 ELSE 0 END) as late,
           SUM(CASE WHEN ear.status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN ear.status = 'excused' THEN 1 ELSE 0 END) as excused
         FROM event_attendance_records ear
         JOIN students st ON st.id = ear.student_id
         WHERE ear.event_id = ? AND st.group_name = ?`
      : `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
         FROM event_attendance_records
         WHERE event_id = ?`;
    const stats = await env.DB.prepare(statsQuery)
      .bind(...(group ? [eventId, group] : [eventId]))
      .first<{ total: number; present: number; late: number; absent: number; excused: number }>();

    const total = stats?.total || 0;
    const present = stats?.present || 0;
    const late = stats?.late || 0;
    const absent = stats?.absent || 0;
    const excused = stats?.excused || 0;

    // "enrolled" is the actual roster size for THIS occurrence (records
    // taken), not a live re-fetched group headcount — a separately computed
    // headcount drifts from what really applied on that date (group
    // membership changes over time, restricted-roster events, etc).
    const enrolled = total;

    // Excused counts against the rate the same as absent (not excluded from
    // the denominator) so the rate/trend stays consistent with the raw
    // present+late+absent+excused breakdown shown elsewhere on the page.
    weeks.push({
      occurrence_type: 'event',
      occurrence_id: eventId,
      occurrence_date: event.event_date as string,
      occurrence_name: event.name as string,
      enrolled,
      present,
      late,
      absent,
      excused,
      total,
      attendance_rate: enrolled > 0 ? Math.round(((present + late) / enrolled) * 100) : 0,
    });
  }

  weeks.sort((a, b) => b.occurrence_date.localeCompare(a.occurrence_date) || b.occurrence_id.localeCompare(a.occurrence_id));

  return success(weeks.slice(0, limit));
};
