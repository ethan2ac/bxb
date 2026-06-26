import { success, created, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateStudent } from '../_shared/validation';
import { generateId, now } from '../_shared/db';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const includeArchived = url.searchParams.get('includeArchived') === 'true';

  let query = 'SELECT * FROM students';
  if (!includeArchived) query += ' WHERE active = 1';
  query += ' ORDER BY name ASC';

  const result = await env.DB.prepare(query).all();
  return success(result.results);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const body = await request.json<Record<string, unknown>>();
  const errors = validateStudent(body);
  if (errors.length > 0) return badRequest(errors.map((e) => e.message).join(', '));

  const id = generateId('stu');
  const timestamp = now();

  await env.DB.prepare(
    `INSERT INTO students (id, name, age, gender, birthday, description, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  )
    .bind(id, (body.name as string).trim(), body.age, (body.gender as string).trim(), body.birthday, body.description || null, timestamp, timestamp)
    .run();

  const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first();
  return created(student);
};
