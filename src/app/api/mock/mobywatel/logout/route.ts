import { sessionCookie } from "@/server/mocks/session";

/** POST /api/mock/mobywatel/logout – SYMULACJA wylogowania: czyści cookie sesji. */
export async function POST() {
  return Response.json({ ok: true, simulation: true }, { headers: { "Set-Cookie": sessionCookie("", 0) } });
}
