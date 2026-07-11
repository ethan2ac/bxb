import { success } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { getOrgTodayDate } from '../_shared/db';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

interface WeeklyRow {
  occurrence_type: 'session' | 'event';
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

  // Exclude future-dated occurrences: nothing has happened yet, so they
  // should never outrank today as the "latest" occurrence under DATE DESC.
  const sessions = await env.DB.prepare(
    'SELECT * FROM sessions WHERE session_date <= ? ORDER BY session_date DESC LIMIT ?',
  )
    .bind(today, limit)
    .all();

  const weeks: WeeklyRow[] = [];

  for (const session of sessions.results || []) {
    const sessionId = session.id as string;
    const sessionDate = session.session_date as string;

    // Without an explicit group filter, detect which group(s) the day's
    // scheduled event(s) actually cover instead of always averaging over the
    // full combined roster. This fallback only applies to legacy sessions —
    // real events (below) already carry their own group_scope directly.
    let effectiveGroup = group;
    if (!effectiveGroup) {
      const dayEvents = await env.DB.prepare('SELECT group_scope FROM events WHERE event_date = ?')
        .bind(sessionDate)
        .all<{ group_scope: string }>();
      const scopes = new Set((dayEvents.results || []).map((e) => e.group_scope));
      if (scopes.size > 0 && !scopes.has('BOTH') && !(scopes.has('BY') && scopes.has('JDY'))) {
        effectiveGroup = scopes.has('JDY') ? 'JDY' : 'BY';
      }
    }

    const statsQuery = effectiveGroup
      ? `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late,
           SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END) as excused
         FROM attendance_records ar
         JOIN students st ON st.id = ar.student_id
         WHERE ar.session_id = ? AND st.group_name = ?`
      : `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
         FROM attendance_records
         WHERE session_id = ?`;
    const stats = await env.DB.prepare(statsQuery)
      .bind(...(effectiveGroup ? [sessionId, effectiveGroup] : [sessionId]))
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
      occurrence_type: 'session',
      occurrence_id: sessionId,
      occurrence_date: sessionDate,
      occurrence_name: null,
      enrolled,
      present,
      late,
      absent,
      excused,
      total,
      attendance_rate: enrolled > 0 ? Math.round(((present + late) / enrolled) * 100) : 0,
    });
  }

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
    const enrolled = total;

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
