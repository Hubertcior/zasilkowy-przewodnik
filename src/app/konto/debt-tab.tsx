"use client";

import { FileText, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Money } from "@/components/money";
import { SimulationBadge } from "@/components/simulation-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WarningCallout } from "@/components/warning-callout";
import { pickActivePeriod } from "@/engine/eligibility";
import { debtWarning } from "@/engine/warnings";
import { useToday } from "@/hooks/use-today";
import type { DebtDetail, Ezla } from "@/server/mocks/personas";
import type { Profile } from "./account-view";
import { TITLE_LABEL } from "./my-data-tab";

interface DebtResult {
  date: string;
  asOf: string;
  amount: number;
  details: DebtDetail[];
  person: { name: string; pesel: string };
}

/** Suggested "right date" options: birth / due date / adoption date, and the first code B sick leave. */
function dateOptions(profile: Profile, ezla: Ezla[]): { label: string; date: string }[] {
  const s = profile.scenario;
  const out: { label: string; date: string }[] = [];
  if (s.kind === "ciaza") out.push({ label: "przewidywany dzień porodu", date: s.dueDate });
  if (s.kind === "urodzenie") out.push({ label: "dzień porodu", date: s.birthDate });
  if (s.kind === "adopcja" || s.kind === "piecza") out.push({ label: "dzień przyjęcia dziecka", date: s.acceptDate });
  const firstB = ezla.filter((z) => z.code === "B").sort((a, b) => a.from.localeCompare(b.from))[0];
  if (firstB) out.push({ label: "początek L4 w ciąży", date: firstB.from });
  return out;
}

/** Simulated debt certificate as of the day the benefit right arises (important for sole traders). */
export function DebtTab({ profile, ezla }: { profile: Profile; ezla: Ezla[] }) {
  const today = useToday();
  const options = dateOptions(profile, ezla);
  const [date, setDate] = useState(options[0]?.date ?? "");
  const [result, setResult] = useState<DebtResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const effectiveDate = date || today || "";

  async function generate(forDate = effectiveDate) {
    const res = await fetch(`/api/mock/zus/zadluzenie?date=${encodeURIComponent(forDate)}`);
    const json = await res.json();
    if (!res.ok) return setError(json?.issues?.[0]?.message ?? json?.message ?? `Błąd ${res.status}`);
    setError(null);
    setResult(json as DebtResult);
  }

  // Generate the preview for the suggested date right away (the most common case).
  const initialDate = options[0]?.date;
  useEffect(() => {
    if (!initialDate) return;
    void fetch(`/api/mock/zus/zadluzenie?date=${encodeURIComponent(initialDate)}`)
      .then((r) => (r.ok ? (r.json() as Promise<DebtResult>) : null))
      .then((json) => json && setResult(json));
  }, [initialDate]);

  const mother = profile.parents.find((p) => p.role === "matka") ?? profile.parents[0];
  const period = mother && result ? pickActivePeriod(mother.periods, result.date) : undefined;

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Zaświadczenie o stanie zadłużenia <SimulationBadge />
          </CardTitle>
          <CardDescription>
            Zasiłek nie jest wypłacany, dopóki nie zostanie spłacone zadłużenie składkowe istniejące na dzień powstania prawa do zasiłku. Ma to
            znaczenie zwłaszcza przy działalności gospodarczej.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="debt-date">Stan na dzień</Label>
              <Input id="debt-date" type="date" value={effectiveDate} onChange={(e) => setDate(e.target.value)} className="sm:w-48" />
            </div>
            <Button onClick={() => generate()} disabled={!effectiveDate}>
              <FileText aria-hidden /> Wygeneruj zaświadczenie
            </Button>
          </div>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {options.map((o) => (
                <Button key={o.label} size="sm" variant="outline" onClick={() => setDate(o.date)}>
                  {o.label} ({o.date})
                </Button>
              ))}
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>

      {result && result.amount > 0 && (
        <WarningCallout className="print:hidden" warning={debtWarning(result.amount, period?.sickness === "dobrowolne")} />
      )}

      {result && (
        <>
          <article
            aria-label="Podgląd zaświadczenia – symulacja"
            className="relative mx-auto max-w-2xl overflow-hidden rounded-lg border bg-white p-6 text-neutral-900 shadow-sm sm:p-10 print:max-w-none print:border-0 print:shadow-none"
          >
            {/* Watermark: required so the document cannot be mistaken for a real ZUS certificate. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-24 select-none">
              {[0, 1, 2].map((i) => (
                <span key={i} className="-rotate-30 text-xl font-black tracking-widest whitespace-nowrap text-red-600/15 uppercase sm:text-4xl">
                  SYMULACJA – dokument niewiążący
                </span>
              ))}
            </div>
            <div className="relative space-y-5 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-dashed border-neutral-400 pb-3">
                <p className="text-xs text-neutral-600">Zasiłkowy Przewodnik · wydruk poglądowy</p>
                <span className="rounded border-2 border-dashed border-red-600 px-2 py-0.5 text-xs font-bold tracking-wider text-red-700 uppercase">
                  Symulacja
                </span>
              </div>
              <h2 className="text-center text-lg font-semibold">Informacja o stanie rozliczeń składek (symulacja)</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-neutral-600">Osoba</dt>
                <dd>{result.person.name}</dd>
                <dt className="text-neutral-600">PESEL</dt>
                <dd>{result.person.pesel} (fikcyjny)</dd>
                <dt className="text-neutral-600">Tytuł ubezpieczenia</dt>
                <dd>{period ? TITLE_LABEL[period.title] : "—"}</dd>
                <dt className="text-neutral-600">Stan na dzień</dt>
                <dd>{result.date}</dd>
                <dt className="text-neutral-600">Ostatnia zmiana salda</dt>
                <dd>{result.asOf}</dd>
              </dl>
              {result.amount > 0 ? (
                <div className="space-y-2">
                  <p>
                    Na wskazany dzień na koncie płatnika występuje zadłużenie z tytułu składek w łącznej kwocie{" "}
                    <strong>
                      <Money value={result.amount} />
                    </strong>
                    :
                  </p>
                  <table className="w-full border-collapse text-left">
                    <tbody>
                      {result.details.map((d) => (
                        <tr key={d.label} className="border-b border-neutral-300">
                          <td className="py-1">{d.label}</td>
                          <td className="py-1 text-right">
                            <Money value={d.amount} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>
                  Na wskazany dzień <strong>nie stwierdzono zadłużenia</strong> z tytułu składek.
                </p>
              )}
              <p className="border-t border-dashed border-neutral-400 pt-3 text-xs text-neutral-600">
                Dokument wygenerowany w symulacji na potrzeby demonstracji. Nie jest zaświadczeniem ZUS i nie ma mocy prawnej. Prawdziwe zaświadczenie
                o niezaleganiu w opłacaniu składek można zamówić na PUE/eZUS (wniosek US-7).
              </p>
            </div>
          </article>
          <div className="flex justify-center print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden /> Drukuj podgląd
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
