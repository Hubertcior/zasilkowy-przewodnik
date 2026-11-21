import { noSession, sessionPersona } from "@/server/mocks/session";
import { debtOn } from "@/server/mocks/personas";

/** GET /api/mock/zus/zadluzenie?date=YYYY-MM-DD – SYMULACJA: zadłużenie składkowe na dzień. */
export async function GET(request: Request) {
  const persona = sessionPersona(request);
  if (!persona) return noSession();
  const date = new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "validation", issues: [{ path: ["date"], message: "Oczekiwano daty YYYY-MM-DD" }] }, { status: 400 });
  }
  return Response.json({ simulation: true, date, amount: debtOn(persona, date) });
}
