import { success, created, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateStudent } from '../_shared/validation';
import { generateId, now } from '../_shared/db';
import { logAudit } from '../_shared/audit';

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
  query += ' ORDER BY english_name ASC';

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
    `INSERT INTO students (id, english_name, chinese_name, age, gender, birthday, phone, description, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  )
    .bind(
      id,
      (body.english_name as string).trim(),
      body.chinese_name ? (body.chinese_name as string).trim() : null,
      body.age,
      (body.gender as string).trim(),
      body.birthday || null,
      body.phone ? (body.phone as string).trim() : null,
      body.description || null,
      timestamp,
      timestamp,
    )
    .run();

  const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first();
  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'student',
    entityId: id,
    action: 'create',
    metadata: { english_name: body.english_name },
  });
  return created(student);
};
