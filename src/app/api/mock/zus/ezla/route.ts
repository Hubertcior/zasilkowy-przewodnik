import { noSession, sessionPersona } from "@/server/mocks/session";

/** GET /api/mock/zus/ezla – SYMULACJA: lista zwolnień lekarskich (e-ZLA). */
export async function GET(request: Request) {
  const persona = sessionPersona(request);
  if (!persona) return noSession();
  return Response.json({ simulation: true, ezla: persona.ezla });
}
