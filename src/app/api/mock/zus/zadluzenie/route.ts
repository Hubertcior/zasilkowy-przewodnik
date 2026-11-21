import { noSession, sessionPersona } from "@/server/mocks/session";
import { debtEntryOn } from "@/server/mocks/personas";

/**
 * GET /api/mock/zus/zadluzenie?date=YYYY-MM-DD – SYMULACJA: zadłużenie składkowe na dzień.
 * → { simulation, date, asOf, amount, details[] } (asOf = date of the last balance change not after `date`).
 */
export async function GET(request: Request) {
  const persona = sessionPersona(request);
  if (!persona) return noSession();
  const date = new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "validation", issues: [{ path: ["date"], message: "Oczekiwano daty YYYY-MM-DD" }] }, { status: 400 });
  }
  const entry = debtEntryOn(persona, date);
  return Response.json({
    simulation: true,
    date,
    asOf: entry.date > "2000-01-01" ? entry.date : date,
    amount: entry.amount,
    details: entry.amount > 0 ? (entry.details ?? [{ label: "Składki", amount: entry.amount }]) : [],
    person: { name: persona.name, pesel: persona.pesel },
  });
}
