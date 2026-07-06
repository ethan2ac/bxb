import { success, badRequest, notFound } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateEvent } from '../_shared/validation';
import { now, attachInviteeIds } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(params.id as string)
    .first<{ id: string }>();
  if (!event) return notFound('Event not found');
  const [withInvitees] = await attachInviteeIds(env.DB, [event]);
  return success(withInvitees);
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const existing = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(params.id as string)
    .first();
  if (!existing) return notFound('Event not found');

  const body = await request.json<Record<string, unknown>>();
  const errors = validateEvent(body);
  if (errors.length > 0) return badRequest(errors.map((e) => e.message).join(', '));

  const id = params.id as string;
  const restrictedRoster = body.restricted_roster === true;
  const inviteeIds = restrictedRoster ? (body.invitee_student_ids as string[]) : [];

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE events SET name = ?, event_date = ?, group_scope = ?, start_time = ?, late_threshold_minutes = ?, notes = ?, restricted_roster = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      (body.name as string).trim(),
      body.event_date,
      body.group_scope,
      body.start_time || '09:00',
      body.late_threshold_minutes || 15,
      body.notes || null,
      restrictedRoster ? 1 : 0,
      now(),
      id,
    ),
    env.DB.prepare('DELETE FROM event_invitees WHERE event_id = ?').bind(id),
    ...inviteeIds.map((studentId) =>
      env.DB.prepare('INSERT INTO event_invitees (event_id, student_id) VALUES (?, ?)').bind(id, studentId),
    ),
  ]);

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first();
  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'event',
    entityId: id,
    action: 'update',
    metadata: { name: body.name },
  });
  return success({ ...event, invitee_student_ids: inviteeIds });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const id = params.id as string;
  const existing = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first<{ name: string }>();
  if (!existing) return notFound('Event not found');

  await env.DB.batch([
    env.DB.prepare('DELETE FROM forecasts WHERE event_id = ?').bind(id),
    env.DB.prepare('DELETE FROM event_attendance_records WHERE event_id = ?').bind(id),
    env.DB.prepare('DELETE FROM event_invitees WHERE event_id = ?').bind(id),
    env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id),
  ]);

  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'event',
    entityId: id,
    action: 'delete',
    metadata: { name: existing.name },
  });
  return success({ deleted: true });
};
