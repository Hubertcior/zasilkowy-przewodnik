import { z } from "zod";
import { parseBody } from "@/server/http";
import { getPersona } from "@/server/mocks/personas";
import { sessionCookie } from "@/server/mocks/session";

const LoginSchema = z.object({ personaId: z.string().min(1).max(50) });

/** POST /api/mock/mobywatel/login – SYMULACJA logowania mObywatel. { personaId } → { token, name } + httpOnly cookie. */
export async function POST(request: Request) {
  const body = await parseBody(request, LoginSchema);
  if ("response" in body) return body.response;
  const persona = getPersona(body.data.personaId);
  if (!persona) return Response.json({ error: "not_found", message: "Nieznana persona" }, { status: 404 });
  return Response.json(
    { token: persona.id, name: persona.name, simulation: true },
    { headers: { "Set-Cookie": sessionCookie(persona.id, 60 * 60 * 8) } },
  );
}
