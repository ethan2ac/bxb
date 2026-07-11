import { success } from '../_shared/response';
import { requireAuth } from '../_shared/auth';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

interface UpcomingRow {
  id: string;
  name: string;
  event_date: string;
  group_scope: string;
  start_time: string;
  enrolled: number;
  expected: number;
  excused: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const today = new Date().toISOString().split('T')[0];

  const events = await env.DB.prepare(
    'SELECT * FROM events WHERE event_date >= ? ORDER BY event_date ASC, start_time ASC LIMIT ?',
  )
    .bind(today, limit)
    .all<{
      id: string;
      name: string;
      event_date: string;
      group_scope: string;
      start_time: string;
      restricted_roster: number;
    }>();

  const rows: UpcomingRow[] = [];

  for (const event of events.results || []) {
    let enrolled = 0;
    if (event.restricted_roster) {
      const inviteeCount = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM event_invitees WHERE event_id = ?',
      )
        .bind(event.id)
        .first<{ count: number }>();
      enrolled = inviteeCount?.count || 0;
    } else {
      const countQuery =
        event.group_scope === 'BOTH'
          ? 'SELECT COUNT(*) as count FROM students WHERE active = 1'
          : 'SELECT COUNT(*) as count FROM students WHERE active = 1 AND group_name = ?';
      const countResult = await env.DB.prepare(countQuery)
        .bind(...(event.group_scope === 'BOTH' ? [] : [event.group_scope]))
        .first<{ count: number }>();
      enrolled = countResult?.count || 0;
    }

    const stats = await env.DB.prepare(
      `SELECT
         SUM(CASE WHEN expected = 'yes' THEN 1 ELSE 0 END) as expected,
         SUM(CASE WHEN expected = 'excused' THEN 1 ELSE 0 END) as excused
       FROM forecasts WHERE event_id = ?`,
    )
      .bind(event.id)
      .first<{ expected: number; excused: number }>();

    rows.push({
      id: event.id,
      name: event.name,
      event_date: event.event_date,
      group_scope: event.group_scope,
      start_time: event.start_time,
      enrolled,
      expected: stats?.expected || 0,
      excused: stats?.excused || 0,
    });
  }

  return success(rows);
};
