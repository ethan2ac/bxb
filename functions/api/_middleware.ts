// Wraps every /api/* route. Without this, an uncaught exception in a
// function handler falls through to Cloudflare's default HTML error page —
// the frontend always expects JSON, so that surfaces as a raw
// "Unexpected token '<'" parse error in the UI instead of a clean message.
export const onRequest: PagesFunction = async (context) => {
  try {
    return await context.next();
  } catch (err) {
    console.error('Unhandled API error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
