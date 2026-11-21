import { connection } from "next/server";
import { z } from "zod";
import { parseBody } from "@/server/http";
import { createThread, listThreads, PUE_CATEGORIES } from "@/server/mocks/pue";
import { noSession, sessionPersona } from "@/server/mocks/session";

const MessageSchema = z.object({
  category: z.enum(PUE_CATEGORIES),
  subject: z.string().max(120).optional(),
  question: z.string().trim().min(5, "Pytanie jest za krótkie").max(2000),
});

/** GET /api/mock/pue/wiadomosc – SYMULACJA: wątki „Zapytaj ZUS” zalogowanej persony. */
export async function GET(request: Request) {
  await connection();
  const persona = sessionPersona(request);
  if (!persona) return noSession();
  return Response.json({ simulation: true, threads: listThreads(persona.id) });
}

/** POST /api/mock/pue/wiadomosc – SYMULACJA: zapisuje pytanie; odpowiedź (szablon) pojawia się po kilku sekundach. */
export async function POST(request: Request) {
  const persona = sessionPersona(request);
  if (!persona) return noSession();
  const body = await parseBody(request, MessageSchema);
  if ("response" in body) return body.response;
  return Response.json({ simulation: true, thread: createThread(persona.id, body.data) }, { status: 201 });
}
