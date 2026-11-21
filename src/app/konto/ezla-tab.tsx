"use client";

import { Calculator, Info } from "lucide-react";
import { useState } from "react";
import { Money } from "@/components/money";
import { PayerBadge } from "@/components/payer-badge";
import { PeriodBadge } from "@/components/period-badge";
import { SimulationBadge } from "@/components/simulation-badge";
import { SourceLink } from "@/components/source-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WarningCallout } from "@/components/warning-callout";
import type { PregnancyCalcResult } from "@/engine/calculate";
import { useToday } from "@/hooks/use-today";
import { cn } from "@/lib/utils";
import type { Ezla } from "@/server/mocks/personas";
import type { Profile } from "./account-view";

const STATUS_LABEL: Record<Ezla["status"], string> = { przyjete: "przyjęte", anulowane: "anulowane" };

/** e-ZLA list (simulation) with code B explained and a pregnancy sick-pay recalculation via /api/pregnancy. */
export function EzlaTab({ profile, ezla }: { profile: Profile; ezla: Ezla[] }) {
  const today = useToday();
  const [result, setResult] = useState<PregnancyCalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mother = profile.parents.find((p) => p.role === "matka") ?? profile.parents[0];
  const bLeaves = ezla.filter((z) => z.code === "B" && z.status === "przyjete");

  async function recalc() {
    if (!bLeaves.length || !mother) return;
    setLoading(true);
    setError(null);
    try {
      // Each certificate separately (gaps between them are not sick days). The employer-paid limit (33/14 days a year,
      // art. 92 § 1 KP) is consumed by earlier certificates from the same calendar year shown on the list.
      const sorted = [...bLeaves].sort((a, b) => a.from.localeCompare(b.from));
      const parts: PregnancyCalcResult[] = [];
      for (const z of sorted) {
        const usedThisYear = parts
          .flatMap((r) => r.periods)
          .filter((p) => p.from.slice(0, 4) === z.from.slice(0, 4))
          .reduce((s, p) => s + p.days, 0);
        const res = await fetch("/api/pregnancy", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            parent: { ...mother, sickDaysThisYear: usedThisYear },
            illnessFrom: z.from,
            illnessTo: z.to,
            codeB: true,
            dueDate: profile.scenario.kind === "ciaza" ? profile.scenario.dueDate : undefined,
            today: today ?? undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.issues?.[0]?.message ?? json?.error ?? `Błąd ${res.status}`);
        parts.push(json as PregnancyCalcResult);
      }
      const uniq = <T,>(xs: T[], key: (x: T) => string) => xs.filter((x, i) => xs.findIndex((y) => key(y) === key(x)) === i);
      setResult({
        ...parts[0],
        eligible: parts.some((r) => r.eligible),
        reasons: uniq(parts.flatMap((r) => r.reasons), (x) => x),
        periods: parts.flatMap((r) => r.periods),
        daysUsed: parts.reduce((s, r) => s + r.daysUsed, 0),
        info: uniq(parts.flatMap((r) => r.info), (x) => x),
        warnings: uniq(parts.flatMap((r) => r.warnings), (w) => w.id),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Zwolnienia lekarskie (e-ZLA) <SimulationBadge />
          </CardTitle>
          <CardDescription>Zaświadczenia wystawione przez lekarza trafiają automatycznie do ZUS i do płatnika zasiłku.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ezla.length === 0 ? (
            <p className="text-muted-foreground text-sm">Na koncie nie ma zaświadczeń lekarskich.</p>
          ) : (
            <>
              {/* Desktop: table; mobile: cards */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seria i numer</TableHead>
                      <TableHead>Okres</TableHead>
                      <TableHead>Kod</TableHead>
                      <TableHead>Lekarz</TableHead>
                      <TableHead>Status / przekazano do</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ezla.map((z) => (
                      <TableRow key={z.id} className={cn(z.code === "B" && "bg-info-soft")}>
                        <TableCell className="font-mono text-xs">{z.series}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {z.from} – {z.to}
                        </TableCell>
                        <TableCell>{z.code ? <Badge>{z.code}</Badge> : "—"}</TableCell>
                        <TableCell>{z.doctor}</TableCell>
                        <TableCell>
                          {STATUS_LABEL[z.status]} · {z.recipient}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="space-y-2 md:hidden">
                {ezla.map((z) => (
                  <li key={z.id} className={cn("rounded-lg border p-3 text-sm", z.code === "B" && "bg-info-soft border-info/30")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {z.from} – {z.to}
                      </span>
                      {z.code && <Badge>kod {z.code}</Badge>}
                    </div>
                    <p className="text-muted-foreground font-mono text-xs">{z.series}</p>
                    <p className="text-muted-foreground">{z.doctor}</p>
                    <p className="text-muted-foreground">
                      {STATUS_LABEL[z.status]} · {z.recipient}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
          {bLeaves.length > 0 && (
            <div className="bg-info-soft border-info/30 flex gap-3 rounded-xl border p-4 text-sm">
              <Info className="text-info mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="space-y-1">
                <p className="font-medium">B = ciąża, 100% zasiłku</p>
                <p>
                  Kod B oznacza niezdolność do pracy przypadającą w okresie ciąży. Za ten czas wynagrodzenie chorobowe i zasiłek chorobowy wynoszą 100%
                  podstawy, a nie 80%.
                </p>
                <SourceLink source="art. 11 ust. 2 pkt 2 ustawy zasiłkowej; art. 92 § 1 pkt 2 Kodeksu pracy" />
              </div>
            </div>
          )}
          {bLeaves.length > 0 && (
            <Button onClick={recalc} disabled={loading}>
              <Calculator aria-hidden /> {loading ? "Liczę…" : "Przelicz chorobowy w ciąży"}
            </Button>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Świadczenia za zwolnienia z kodem B</CardTitle>
            <CardDescription>
              Podstawa wymiaru: <Money value={result.base.base} /> · {result.daysUsed} dni niezdolności do pracy (okres zasiłkowy w ciąży: do 270
              dni). Liczone osobno dla każdego zwolnienia z listy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!result.eligible && result.reasons.map((r) => <p key={r} className="text-destructive text-sm">{r}</p>)}
            {result.periods.length > 0 && (
              <ul className="space-y-2">
                {result.periods.map((p, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <PeriodBadge type={p.type} />
                      <span>
                        {p.from} – {p.to} ({p.days} dni, {Math.round(p.rate * 100)}%)
                      </span>
                      <PayerBadge payer={p.payer} />
                    </div>
                    <Money value={p.total} className="font-semibold" />
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm">
              Razem: <Money value={result.periods.reduce((s, p) => s + p.total, 0)} className="font-semibold" />
            </p>
            {result.warnings.map((w) => (
              <WarningCallout key={w.id} warning={w} />
            ))}
            {result.info.map((x) => (
              <p key={x} className="text-muted-foreground text-sm">
                {x}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
