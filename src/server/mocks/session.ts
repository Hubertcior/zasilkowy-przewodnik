import { getPersona, type Persona } from "./personas";

// SYMULACJA session: the "token" is the persona id stored in an httpOnly cookie.

export const SESSION_COOKIE = "zp_session";

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function sessionPersona(request: Request): Persona | undefined {
  const id = readCookie(request, SESSION_COOKIE);
  return id ? getPersona(id) : undefined;
}

export function sessionCookie(value: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function noSession() {
  return Response.json({ error: "unauthorized", message: "Brak sesji – zaloguj się (symulacja mObywatel).", simulation: true }, { status: 401 });
}
