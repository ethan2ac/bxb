import { success, badRequest, notFound } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateStudent } from '../_shared/validation';
import { now } from '../_shared/db';

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
    `UPDATE students SET name = ?, age = ?, gender = ?, birthday = ?, description = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      (body.name as string).trim(),
      body.age,
      (body.gender as string).trim(),
      body.birthday,
      body.description || null,
      now(),
      params.id as string,
    )
    .run();

  const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?')
    .bind(params.id as string)
    .first();
  return success(student);
};
