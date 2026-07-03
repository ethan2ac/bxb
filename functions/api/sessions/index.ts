import { success, created, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateSession } from '../_shared/validation';
import { generateId, now, getSettings } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const result = await env.DB.prepare(
    'SELECT * FROM sessions ORDER BY session_date DESC LIMIT ? OFFSET ?',
  )
    .bind(limit, offset)
    .all();
  return success(result.results);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await request.json<Record<string, unknown>>();
  const errors = validateSession(body);
  if (errors.length > 0) return badRequest(errors.map((e) => e.message).join(', '));

  const sessionDate = body.session_date as string;

  const existing = await env.DB.prepare('SELECT * FROM sessions WHERE session_date = ?')
    .bind(sessionDate)
    .first();
  if (existing) return success(existing);

  const settings = await getSettings(env.DB);
  const id = generateId('ses');
  const timestamp = now();
  const startTime = (body.start_time as string) || settings.default_start_time;
  const threshold = (body.late_threshold_minutes as number) || parseInt(settings.default_late_threshold_minutes, 10);

  try {
    await env.DB.prepare(
      `INSERT INTO sessions (id, session_date, start_time, late_threshold_minutes, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, sessionDate, startTime, threshold, body.notes || null, timestamp, timestamp)
      .run();
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      const existing2 = await env.DB.prepare('SELECT * FROM sessions WHERE session_date = ?')
        .bind(sessionDate)
        .first();
      return success(existing2);
    }
    throw e;
  }

  const session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?').bind(id).first();
  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'session',
    entityId: id,
    action: 'create',
    metadata: { session_date: sessionDate },
  });
  return created(session);
};
