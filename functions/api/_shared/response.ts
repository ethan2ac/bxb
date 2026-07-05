export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function success(data: unknown): Response {
  return json({ ok: true, data }, 200);
}

export function created(data: unknown): Response {
  return json({ ok: true, data }, 201);
}

export function badRequest(message: string): Response {
  return json({ ok: false, error: message }, 400);
}

export function unauthorized(message = 'Unauthorized'): Response {
  return json({ ok: false, error: message }, 401);
}

export function forbidden(message = 'Forbidden'): Response {
  return json({ ok: false, error: message }, 403);
}

export function notFound(message = 'Not found'): Response {
  return json({ ok: false, error: message }, 404);
}

export function conflict(message: string): Response {
  return json({ ok: false, error: message }, 409);
}

export function serverError(message = 'Internal server error'): Response {
  return json({ ok: false, error: message }, 500);
}
