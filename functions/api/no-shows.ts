import { success } from './_shared/response';
import { requireAuth } from './_shared/auth';
import { calculateNoShows, getSettings, reconcileAttendance } from './_shared/db';

interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  await reconcileAttendance(env.DB);

  const url = new URL(request.url);
  const group = url.searchParams.get('group') || undefined;

  const settings = await getSettings(env.DB);
  const threshold = parseInt(settings.no_show_threshold, 10);
  const noShows = await calculateNoShows(env.DB, threshold, group);
  return success(noShows);
};
