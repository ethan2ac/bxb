import { success, badRequest, notFound } from '../_shared/response';
import { requireAuth } from '../_shared/auth';
import { validateStudent } from '../_shared/validation';
import { now, resolveStudentNameAndAge } from '../_shared/db';
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

  const { englishName, age } = resolveStudentNameAndAge(body);
  const level = body.group_name === 'JDY' ? 'JDY' : (body.level as string).trim();

  await env.DB.prepare(
    `UPDATE students SET english_name = ?, chinese_name = ?, group_name = ?, level = ?, age = ?, gender = ?, birthday = ?, phone = ?, description = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      englishName,
      body.english_name && body.chinese_name ? (body.chinese_name as string).trim() : null,
      body.group_name,
      level,
      age,
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
    metadata: { english_name: englishName, group_name: body.group_name },
  });
  return success(student);
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const studentId = params.id as string;
  const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(studentId).first();
  if (!student) return notFound('Student not found');
  if (student.active) return badRequest('Archive the student before permanently removing them');

  await env.DB.batch([
    env.DB.prepare('DELETE FROM attendance_records WHERE student_id = ?').bind(studentId),
    env.DB.prepare('DELETE FROM event_attendance_records WHERE student_id = ?').bind(studentId),
    env.DB.prepare('DELETE FROM forecasts WHERE student_id = ?').bind(studentId),
    env.DB.prepare('DELETE FROM students WHERE id = ?').bind(studentId),
  ]);

  await logAudit(env.DB, {
    actorUserId: auth.id,
    entityType: 'student',
    entityId: studentId,
    action: 'delete',
    metadata: { english_name: student.english_name, chinese_name: student.chinese_name },
  });
  return success({ id: studentId });
};
