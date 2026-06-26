import { success, serverError } from './_shared/response';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const result = await env.DB.prepare('SELECT 1 as ok').first<{ ok: number }>();
    return success({ status: 'healthy', db: result?.ok === 1 ? 'connected' : 'error' });
  } catch {
    return serverError('Database connection failed');
  }
};
