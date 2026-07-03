import { success } from './_shared/response';
import { requireAuth } from './_shared/auth';
import { calculateNoShows, getSettings } from './_shared/db';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const settings = await getSettings(env.DB);
  const threshold = parseInt(settings.no_show_threshold, 10);
  const noShows = await calculateNoShows(env.DB, threshold);
  return success(noShows);
};
