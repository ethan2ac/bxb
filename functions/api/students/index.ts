import { success, created, badRequest } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateStudent } from '../_shared/validation';
import { generateId, now, resolveStudentNameAndAge } from '../_shared/db';
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
  const group = url.searchParams.get('group');
  const level = url.searchParams.get('level');

  let query = 'SELECT * FROM students';
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (!includeArchived) conditions.push('active = 1');
  if (group) {
    conditions.push('group_name = ?');
    bindings.push(group);
  }
  if (level) {
    conditions.push('level = ?');
    bindings.push(level);
  }
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  // Mirrors levelSortIndex on the frontend (JDY, then the P4-S4 progression),
  // rather than the previous alphabetical-by-name default.
  query += ` ORDER BY CASE level
    WHEN 'JDY' THEN 0
    WHEN 'P4' THEN 1
    WHEN 'P5' THEN 2
    WHEN 'P6' THEN 3
    WHEN 'S1' THEN 4
    WHEN 'S2' THEN 5
    WHEN 'S3' THEN 6
    WHEN 'S4' THEN 7
    ELSE 8
  END, english_name ASC`;

  const result = await env.DB.prepare(query).bind(...bindings).all();
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
  const { englishName, age } = resolveStudentNameAndAge(body);
  const level = body.group_name === 'JDY' ? 'JDY' : (body.level as string).trim();

  await env.DB.prepare(
    `INSERT INTO students (id, english_name, chinese_name, group_name, level, age, gender, birthday, phone, description, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  )
    .bind(
      id,
      englishName,
      body.english_name && body.chinese_name ? (body.chinese_name as string).trim() : null,
      body.group_name,
      level,
      age,
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
    metadata: { english_name: englishName, group_name: body.group_name },
  });
  return created(student);
};
