import { timingSafeEqual } from "node:crypto";

/**
 * Checks the x-admin-key header against ADMIN_PASSWORD.
 * If ADMIN_PASSWORD is not set, every request is rejected.
 */
export function isAdmin(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  const given = request.headers.get("x-admin-key");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unauthorized() {
  return Response.json({ error: "Brak uprawnień: nieprawidłowy x-admin-key" }, { status: 401 });
}
