import { z } from "zod";
import { checkPassword, createSessionToken, sessionCookieHeader } from "@/server/adminAuth";
import { parseBody } from "@/server/http";

/** POST /api/admin/login { password } → httpOnly session cookie. */
export async function POST(request: Request) {
  const body = await parseBody(request, z.object({ password: z.string().max(200) }));
  if ("response" in body) return body.response;
  if (!checkPassword(body.data.password)) {
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    return Response.json({ error: "Nieprawidłowe hasło" }, { status: 401 });
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookieHeader(createSessionToken()) } });
}
