import { createHmac, timingSafeEqual } from "node:crypto";

// Admin authentication: header `x-admin-key` (API clients) or httpOnly session cookie (panel /admin).
// Password: ADMIN_PASSWORD; when not set, the demo default "demo-zus" is used (documented in README).

export const ADMIN_COOKIE = "zp_admin";
export const DEFAULT_ADMIN_PASSWORD = "demo-zus";
const SESSION_HOURS = 8;

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

export function usingDefaultPassword(): boolean {
  return !process.env.ADMIN_PASSWORD;
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(given: string | null | undefined): boolean {
  return !!given && safeEqual(given, adminPassword());
}

/** Stateless session token: expiry + HMAC(password, expiry). Changing the password invalidates sessions. */
export function createSessionToken(now = Date.now()): string {
  const exp = String(now + SESSION_HOURS * 3600_000);
  const sig = createHmac("sha256", adminPassword()).update(`admin:${exp}`).digest("hex");
  return `${exp}.${sig}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < now) return false;
  const expected = createHmac("sha256", adminPassword()).update(`admin:${exp}`).digest("hex");
  return safeEqual(sig, expected);
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function sessionCookieHeader(token: string, maxAgeSeconds = SESSION_HOURS * 3600): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

/** True for a valid x-admin-key header or a valid admin session cookie. */
export function isAdmin(request: Request): boolean {
  return checkPassword(request.headers.get("x-admin-key")) || verifySessionToken(readCookie(request, ADMIN_COOKIE));
}

export function unauthorized() {
  return Response.json({ error: "Brak uprawnień: zaloguj się do panelu lub podaj x-admin-key" }, { status: 401 });
}
