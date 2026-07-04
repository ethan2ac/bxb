import { success, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateForecast } from '../_shared/validation';
import { generateId, now } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

interface ForecastEntry {
  student_id: string;
  expected: string;
  notes?: string | null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await request.json<{
    event_id: string;
    records: ForecastEntry[];
  }>();

  if (!body.event_id) return badRequest('event_id is required');
  if (!Array.isArray(body.records) || body.records.length === 0) {
    return badRequest('records array is required and must not be empty');
  }

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(body.event_id)
    .first();

  if (!event) return badRequest('Event not found');

  const timestamp = now();
  const statements: D1PreparedStatement[] = [];

  for (const entry of body.records) {
    if (!entry.student_id) continue;
    if (!validateForecast(entry.expected)) continue;

    const studentExists = await env.DB.prepare('SELECT id FROM students WHERE id = ?')
      .bind(entry.student_id)
      .first();
    if (!studentExists) continue;

    statements.push(
      env.DB.prepare(
        `INSERT INTO forecasts (id, student_id, event_id, expected, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id, event_id) DO UPDATE SET
           expected = excluded.expected,
           notes = excluded.notes,
           updated_at = excluded.updated_at`,
      ).bind(
        generateId('fcst'),
        entry.student_id,
        body.event_id,
        entry.expected,
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
      action: 'forecast_save',
      metadata: { recordCount: statements.length },
    });
  }

  const records = await env.DB.prepare(
    `SELECT f.*, s.english_name || CASE WHEN s.chinese_name IS NOT NULL AND s.chinese_name != '' THEN '/' || s.chinese_name ELSE '' END as student_name
     FROM forecasts f
     JOIN students s ON s.id = f.student_id
     WHERE f.event_id = ?
     ORDER BY s.english_name ASC`,
  )
    .bind(body.event_id)
    .all();

  return success({ event, records: records.results });
};
