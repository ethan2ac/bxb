import { success, badRequest, notFound } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateStudent } from '../_shared/validation';
import { now } from '../_shared/db';
import { logAudit } from '../_shared/audit';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?')
    .bind(params.id as string)
    .first();
  if (!student) return notFound('Student not found');
  return success(student);
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const existing = await env.DB.prepare('SELECT * FROM students WHERE id = ?')
    .bind(params.id as string)
    .first();
  if (!existing) return notFound('Student not found');

  const body = await request.json<Record<string, unknown>>();
  const errors = validateStudent(body);
  if (errors.length > 0) return badRequest(errors.map((e) => e.message).join(', '));

  await env.DB.prepare(
    `UPDATE students SET english_name = ?, chinese_name = ?, group_name = ?, level = ?, age = ?, gender = ?, birthday = ?, phone = ?, description = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      body.english_name ? (body.english_name as string).trim() : null,
      body.chinese_name ? (body.chinese_name as string).trim() : null,
      body.group_name,
      (body.level as string).trim(),
      body.age || null,
      (body.gender as string).trim(),
      body.birthday || null,
      body.phone ? (body.phone as string).trim() : null,
      body.description || null,
      now(),
      params.id as string,
    )
    .run();

  const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?')
    .bind(params.id as string)
    .first();
  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'student',
    entityId: params.id as string,
    action: 'update',
    metadata: { english_name: body.english_name, group_name: body.group_name },
  });
  return success(student);
};
