import { noSession, sessionPersona } from "@/server/mocks/session";

/** GET /api/mock/zus/profile – SYMULACJA danych z ZUS: okresy ubezpieczenia, przychody, płatnik, sytuacja. */
export async function GET(request: Request) {
  const persona = sessionPersona(request);
  if (!persona) return noSession();
  const { id, name, pesel, parents, scenario } = persona;
  return Response.json({ simulation: true, persona: { id, name, pesel }, parents, scenario });
}
