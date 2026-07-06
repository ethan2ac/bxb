import { success, created, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateEvent } from '../_shared/validation';
import { generateId, now, getSettings, attachInviteeIds } from '../_shared/db';
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
  const group = url.searchParams.get('group');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const date = url.searchParams.get('date');

  let query = 'SELECT * FROM events';
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (group) {
    conditions.push("(group_scope = ? OR group_scope = 'BOTH')");
    bindings.push(group);
  }
  if (date) {
    conditions.push('event_date = ?');
    bindings.push(date);
  }
  if (from) {
    conditions.push('event_date >= ?');
    bindings.push(from);
  }
  if (to) {
    conditions.push('event_date <= ?');
    bindings.push(to);
  }
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY event_date DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  const result = await env.DB.prepare(query).bind(...bindings).all();
  const events = await attachInviteeIds(env.DB, result.results as { id: string }[]);
  return success(events);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await request.json<Record<string, unknown>>();
  const errors = validateEvent(body);
  if (errors.length > 0) return badRequest(errors.map((e) => e.message).join(', '));

  const settings = await getSettings(env.DB);
  const id = generateId('evt');
  const timestamp = now();
  const startTime = (body.start_time as string) || settings.default_start_time;
  const threshold = (body.late_threshold_minutes as number) || parseInt(settings.default_late_threshold_minutes, 10);
  const restrictedRoster = body.restricted_roster === true;
  const inviteeIds = restrictedRoster ? (body.invitee_student_ids as string[]) : [];

  const statements = [
    env.DB.prepare(
      `INSERT INTO events (id, name, event_date, group_scope, start_time, late_threshold_minutes, notes, restricted_roster, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      (body.name as string).trim(),
      body.event_date,
      body.group_scope,
      startTime,
      threshold,
      body.notes || null,
      restrictedRoster ? 1 : 0,
      timestamp,
      timestamp,
    ),
    ...inviteeIds.map((studentId) =>
      env.DB.prepare('INSERT INTO event_invitees (event_id, student_id) VALUES (?, ?)').bind(id, studentId),
    ),
  ];
  await env.DB.batch(statements);

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first();
  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'event',
    entityId: id,
    action: 'create',
    metadata: { name: body.name, event_date: body.event_date, group_scope: body.group_scope },
  });
  return created({ ...event, invitee_student_ids: inviteeIds });
};
