import { success, notFound, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { isNonEmptyString, isPositiveInteger } from '../_shared/validation';
import { now } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(params.id as string)
    .first();
  if (!session) return notFound('Session not found');
  return success(session);
};

// Keeps a session's start_time/late_threshold_minutes in sync with the
// event that governs its date, since sessions are auto-created lazily
// (often before an event's own time settings are known/edited).
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const existing = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(params.id as string)
    .first<{ id: string; start_time: string; late_threshold_minutes: number; notes: string | null }>();
  if (!existing) return notFound('Session not found');

  const body = await request.json<Record<string, unknown>>();
  if (body.start_time !== undefined && !isNonEmptyString(body.start_time)) {
    return badRequest('Start time must be a valid time string');
  }
  if (body.late_threshold_minutes !== undefined && !isPositiveInteger(body.late_threshold_minutes)) {
    return badRequest('Late threshold must be a positive integer');
  }

  const startTime = (body.start_time as string) ?? existing.start_time;
  const threshold = (body.late_threshold_minutes as number) ?? existing.late_threshold_minutes;
  const notes = body.notes !== undefined ? (body.notes as string | null) : existing.notes;

  await env.DB.prepare(
    'UPDATE sessions SET start_time = ?, late_threshold_minutes = ?, notes = ?, updated_at = ? WHERE id = ?',
  )
    .bind(startTime, threshold, notes, now(), existing.id)
    .run();

  const session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?').bind(existing.id).first();
  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'session',
    entityId: existing.id,
    action: 'update',
    metadata: { start_time: startTime, late_threshold_minutes: threshold },
  });
  return success(session);
};
