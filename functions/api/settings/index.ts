import { success, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { getSettings, now } from '../_shared/db';
import { logAudit } from '../_shared/audit';
import { isPositiveInteger, isNonEmptyString } from '../_shared/validation';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

const EDITABLE_KEYS = ['no_show_threshold', 'default_start_time', 'default_late_threshold_minutes'] as const;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const settings = await getSettings(env.DB);
  return success(settings);
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await request.json<Record<string, unknown>>();

  if (body.no_show_threshold !== undefined && !isPositiveInteger(body.no_show_threshold)) {
    return badRequest('no_show_threshold must be a positive integer');
  }
  if (body.default_start_time !== undefined && !isNonEmptyString(body.default_start_time)) {
    return badRequest('default_start_time must be a non-empty string');
  }
  if (
    body.default_late_threshold_minutes !== undefined &&
    !isPositiveInteger(body.default_late_threshold_minutes)
  ) {
    return badRequest('default_late_threshold_minutes must be a positive integer');
  }

  const timestamp = now();
  const statements: D1PreparedStatement[] = [];

  for (const key of EDITABLE_KEYS) {
    if (body[key] === undefined) continue;
    statements.push(
      env.DB.prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ).bind(key, String(body[key]), timestamp),
    );
  }

  if (statements.length > 0) {
    await env.DB.batch(statements);
    await logAudit(env.DB, {
      actorUserId: auth.id,
      entityType: 'settings',
      entityId: 'global',
      action: 'update',
      metadata: Object.fromEntries(EDITABLE_KEYS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]])),
    });
  }

  const settings = await getSettings(env.DB);
  return success(settings);
};
