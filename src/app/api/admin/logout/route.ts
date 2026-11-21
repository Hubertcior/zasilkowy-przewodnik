import { sessionCookieHeader } from "@/server/adminAuth";

/** POST /api/admin/logout – clears the admin session cookie. */
export async function POST() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookieHeader("", 0) } });
}
