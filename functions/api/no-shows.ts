import { success } from './_shared/response';
import { requireAuth } from './_shared/auth';
import { calculateNoShows } from './_shared/db';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const noShows = await calculateNoShows(env.DB);
  return success(noShows);
};
