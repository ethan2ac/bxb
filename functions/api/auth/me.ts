import { success, unauthorized } from '../_shared/response';
import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env);
  if (!user) return unauthorized();
  return success({ user });
};
