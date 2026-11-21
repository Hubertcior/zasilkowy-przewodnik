"use client";

import { Plus, Printer, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExplainSteps } from "@/components/explain-steps";
import { Money } from "@/components/money";
import { PayerBadge } from "@/components/payer-badge";
import { PeriodBadge } from "@/components/period-badge";
import { StatCard } from "@/components/stat-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WarningCallout } from "@/components/warning-callout";
import type { CalculateResult } from "@/engine/calculate";
import type { LeavePlan, ParentData, Scenario } from "@/engine/types";
import { useToday } from "@/hooks/use-today";
import { useCaseStore } from "@/store/useCaseStore";
import { MoneyChart } from "./money-chart";
import { Timeline } from "./timeline";

type Role = "matka" | "ojciec";
type CalcScenario = Extract<Scenario, { kind: "urodzenie" | "adopcja" | "piecza" }>;

const selectCls =
  "border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]";
const num = (v: string) => (v === "" ? undefined : Number(v.replace(",", ".")));
const weeks = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1).replace(".", ",")} tyg.`;

function syntheticParent(role: Role): ParentData {
  // Quick mode without data: an employee insured long enough; the base comes from baseOverride.
  return { role, periods: [{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2015-01-01", payerInsuredCount: 50 }], incomes: [] };
}

function toCalcScenario(s: Scenario | undefined, today: string): CalcScenario {
  if (!s) return { kind: "urodzenie", birthDate: today, children: 1, zaZyciem: false };
  if (s.kind === "ciaza") return { kind: "urodzenie", birthDate: s.dueDate, children: 1, zaZyciem: false };
  return s;
}

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
      </Label>
      {children}
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  );
}

export function Calculator() {
  const store = useCaseStore();
  const router = useRouter();
  const todayStr = useToday();
  const hasStoreData = store.parents.length > 0 && !!store.scenario;

  const [quickFather, setQuickFather] = useState(true);
  const parents: ParentData[] = useMemo(() => {
    if (hasStoreData) return store.parents;
    return quickFather ? [syntheticParent("matka"), syntheticParent("ojciec")] : [syntheticParent("matka")];
  }, [hasStoreData, store.parents, quickFather]);

  const [scenario, setScenario] = useState<CalcScenario | null>(null);
  const [baseOverride, setBaseOverride] = useState<Partial<Record<Role, number>>>(hasStoreData ? {} : { matka: 6040.3, ojciec: 6903.2 });
  const [plan, setPlan] = useState<LeavePlan | undefined>(store.plan);
  const [result, setResult] = useState<CalculateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paramsVersion, setParamsVersion] = useState<string | null>(null);
  const reqId = useRef(0);

  const sc = scenario ?? (todayStr ? toCalcScenario(store.scenario, todayStr) : null);

  useEffect(() => {
    fetch("/api/params")
      .then((r) => r.json())
      .then((p) => setParamsVersion(`${p.version} (od ${p.effectiveFrom})`))
      .catch(() => {});
  }, []);

  // Debounced POST /api/calculate on every change.
  useEffect(() => {
    if (!sc) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/calculate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ parents, scenario: sc, plan, baseOverride, today: todayStr ?? undefined }),
        });
        const json = await res.json();
        if (id !== reqId.current) return;
        if (!res.ok) {
          setError(json.issues?.map((i: { path?: string[]; message: string }) => `${i.path?.join(".")}: ${i.message}`).slice(0, 3).join("; ") ?? "Błąd");
        } else {
          setError(null);
          setResult(json);
          if (!plan) setPlan(json.plan);
        }
      } catch {
        if (id === reqId.current) setError("Brak połączenia z serwerem");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [parents, sc, plan, baseOverride, todayStr]);

  const roles = parents.map((p) => p.role);
  const ent = result?.entitlement;
  const updPlan = (patch: Partial<LeavePlan>) => plan && setPlan({ ...plan, ...patch });
  const updScenario = (patch: Partial<CalcScenario>) => sc && setScenario({ ...sc, ...patch } as CalcScenario);

  if (!sc) return <div className="bg-muted h-96 animate-pulse rounded-xl" />;

  const options = (
    <div className="space-y-5">
      {/* --- situation --- */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Sytuacja</h3>
        <Field label="Rodzaj" htmlFor="kind">
          <select
            id="kind"
            className={selectCls}
            value={sc.kind}
            onChange={(e) => {
              const kind = e.target.value as CalcScenario["kind"];
              const date = "birthDate" in sc ? sc.birthDate : sc.acceptDate;
              setScenario(kind === "urodzenie" ? { kind, birthDate: date, children: 1, zaZyciem: false } : { kind, acceptDate: date, children: 1, childAges: [1] });
            }}
          >
            <option value="urodzenie">Urodzenie dziecka</option>
            <option value="adopcja">Adopcja</option>
            <option value="piecza">Rodzina zastępcza niezawodowa</option>
          </select>
        </Field>
        {sc.kind === "urodzenie" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Data porodu" htmlFor="bd">
                <Input id="bd" type="date" value={sc.birthDate} onChange={(e) => e.target.value && updScenario({ birthDate: e.target.value })} />
              </Field>
              <Field label="Liczba dzieci" htmlFor="ch">
                <Input id="ch" type="number" min={1} max={10} value={sc.children} onChange={(e) => updScenario({ children: Math.max(1, Number(e.target.value) || 1) })} />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="zz" checked={sc.zaZyciem} onCheckedChange={(v) => updScenario({ zaZyciem: v === true })} />
              <Label htmlFor="zz" className="font-normal">
                Zaświadczenie „Za życiem”
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pm"
                checked={!!sc.prematurity}
                onCheckedChange={(v) => updScenario({ prematurity: v === true ? { gestationWeek: 30, birthWeightG: 1400, hospitalWeeks: 4 } : undefined })}
              />
              <Label htmlFor="pm" className="font-normal">
                Wcześniak / pobyt w szpitalu
              </Label>
            </div>
            {sc.prematurity && (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Tydzień" htmlFor="gw">
                  <Input id="gw" type="number" value={sc.prematurity.gestationWeek} onChange={(e) => updScenario({ prematurity: { ...sc.prematurity!, gestationWeek: Number(e.target.value) || 20 } })} />
                </Field>
                <Field label="Masa (g)" htmlFor="bw">
                  <Input id="bw" type="number" value={sc.prematurity.birthWeightG} onChange={(e) => updScenario({ prematurity: { ...sc.prematurity!, birthWeightG: Number(e.target.value) || 300 } })} />
                </Field>
                <Field label="Tyg. w szpitalu" htmlFor="hw">
                  <Input id="hw" type="number" step="0.5" value={sc.prematurity.hospitalWeeks} onChange={(e) => updScenario({ prematurity: { ...sc.prematurity!, hospitalWeeks: Number(e.target.value) || 0 } })} />
                </Field>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data przyjęcia" htmlFor="ad">
              <Input id="ad" type="date" value={sc.acceptDate} onChange={(e) => e.target.value && updScenario({ acceptDate: e.target.value })} />
            </Field>
            <Field label="Wiek dzieci (lata)" htmlFor="ages" hint="np. 2 lub 2, 5">
              <Input
                id="ages"
                defaultValue={sc.childAges.join(", ")}
                onBlur={(e) => {
                  const ages = e.target.value.split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 18);
                  if (ages.length) updScenario({ childAges: ages, children: ages.length });
                }}
              />
            </Field>
          </div>
        )}
      </section>

      {/* --- bases --- */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Podstawa wymiaru</h3>
        {!hasStoreData && (
          <div className="flex items-center gap-2">
            <Checkbox id="qf" checked={quickFather} onCheckedChange={(v) => setQuickFather(v === true)} />
            <Label htmlFor="qf" className="font-normal">
              Uwzględnij tatę
            </Label>
          </div>
        )}
        {roles.map((r) => (
          <Field
            key={r}
            label={`${r === "matka" ? "Mama" : "Tata"} – własna podstawa (zł)`}
            htmlFor={`base-${r}`}
            hint={hasStoreData ? `z danych: ${result?.bases[r] && baseOverride[r] === undefined ? result.bases[r]!.base.toFixed(2).replace(".", ",") + " zł" : "—"}; zostaw puste, by liczyć z danych` : "pensja brutto × 0,8629"}
          >
            <Input
              id={`base-${r}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={baseOverride[r] ?? ""}
              onChange={(e) => setBaseOverride({ ...baseOverride, [r]: num(e.target.value) })}
            />
          </Field>
        ))}
      </section>

      {/* --- plan --- */}
      {plan && ent && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Plan urlopów</h3>
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Switch id="long" checked={plan.longApplication} onCheckedChange={(v) => updPlan({ longApplication: v })} />
            <Label htmlFor="long" className="flex-col items-start gap-0.5 font-normal">
              <span className="font-medium">Wniosek o cały urlop (81,5%)</span>
              <span className="text-muted-foreground text-xs">Złożony do 21 dni po porodzie. 9 tygodni taty zawsze 70%.</span>
            </Label>
          </div>
          {sc.kind === "urodzenie" && roles.includes("ojciec") && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="to"
                  checked={plan.fatherTakesOverFromWeek !== undefined}
                  onCheckedChange={(v) => updPlan({ fatherTakesOverFromWeek: v === true ? ent.obligatoryMotherWeeks : undefined })}
                />
                <Label htmlFor="to" className="font-normal">
                  Tata przejmuje resztę macierzyńskiego
                </Label>
              </div>
              {plan.fatherTakesOverFromWeek !== undefined && (
                <Field label={`Mama wykorzystuje tygodni (min. ${ent.obligatoryMotherWeeks}, maks. ${ent.maternityWeeks})`} htmlFor="mw">
                  <Input
                    id="mw"
                    type="number"
                    min={ent.obligatoryMotherWeeks}
                    max={ent.maternityWeeks}
                    value={plan.fatherTakesOverFromWeek}
                    onChange={(e) => updPlan({ fatherTakesOverFromWeek: Number(e.target.value) || 0 })}
                  />
                </Field>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Urlop rodzicielski ({ent.parentalWeeks} tyg., maks. 5 części)</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={plan.parental.length >= 5}
                onClick={() => updPlan({ parental: [...plan.parental, { parent: roles.includes("ojciec") ? "ojciec" : "matka", weeks: 1 }] })}
              >
                <Plus className="size-4" aria-hidden /> Część
              </Button>
            </div>
            {plan.parental.map((part, i) => (
              <div key={i} className="grid grid-cols-[1fr_4.5rem_1fr_auto] items-end gap-1.5">
                <Field label="Kto" htmlFor={`pp-${i}`}>
                  <select
                    id={`pp-${i}`}
                    className={selectCls}
                    value={part.parent}
                    onChange={(e) => updPlan({ parental: plan.parental.map((p, j) => (j === i ? { ...p, parent: e.target.value as Role } : p)) })}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r === "matka" ? "Mama" : "Tata"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tyg." htmlFor={`pw-${i}`}>
                  <Input
                    id={`pw-${i}`}
                    type="number"
                    min={1}
                    max={ent.parentalWeeks}
                    value={part.weeks}
                    onChange={(e) => updPlan({ parental: plan.parental.map((p, j) => (j === i ? { ...p, weeks: Math.max(1, Number(e.target.value) || 1) } : p)) })}
                  />
                </Field>
                <Field label="Praca" htmlFor={`pf-${i}`}>
                  <select
                    id={`pf-${i}`}
                    className={selectCls}
                    value={part.workFraction ?? 0}
                    onChange={(e) => updPlan({ parental: plan.parental.map((p, j) => (j === i ? { ...p, workFraction: Number(e.target.value) || undefined } : p)) })}
                  >
                    <option value={0}>bez pracy</option>
                    <option value={0.25}>¼ etatu</option>
                    <option value={0.5}>½ etatu</option>
                  </select>
                </Field>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Usuń część ${i + 1}`}
                  onClick={() => updPlan({ parental: plan.parental.filter((_, j) => j !== i) })}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          {roles.includes("ojciec") && sc.kind !== "piecza" && (
            <Field label="Urlop ojcowski" htmlFor="pat">
              <select id="pat" className={selectCls} value={plan.paternityWeeks ?? 0} onChange={(e) => updPlan({ paternityWeeks: Number(e.target.value) as 0 | 1 | 2 })}>
                <option value={0}>nie</option>
                <option value={1}>1 tydzień</option>
                <option value={2}>2 tygodnie</option>
              </select>
            </Field>
          )}
          {ent.supplementaryWeeks > 0 && (
            <p className="text-muted-foreground text-xs">
              Urlop uzupełniający: {ent.supplementaryWeeks} tyg. – wykorzystuje rodzic, który kończy urlop macierzyński.
            </p>
          )}
        </section>
      )}
    </div>
  );

  const s = result?.schedule;
  const totalWeeks = s ? Math.round(s.periods.filter((p) => p.type !== "ojcowski").reduce((a, p) => a + p.days, 0) / 7) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <aside className="print:hidden lg:sticky lg:top-20 lg:self-start">
        <Card className="lg:hidden">
          <Accordion type="single" collapsible defaultValue="opts">
            <AccordionItem value="opts" className="border-0">
              <AccordionTrigger className="px-4">Opcje kalkulatora</AccordionTrigger>
              <AccordionContent className="px-4">{options}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
        <Card className="hidden max-h-[calc(100dvh-6rem)] overflow-y-auto lg:block">
          <CardHeader>
            <CardTitle className="text-base">Opcje</CardTitle>
          </CardHeader>
          <CardContent>{options}</CardContent>
        </Card>
      </aside>

      <div className="min-w-0 space-y-6" aria-live="polite" aria-busy={loading}>
        {error && <p className="text-destructive text-sm">Nie udało się policzyć: {error}</p>}
        {!result && !error && <div className="bg-muted h-64 animate-pulse rounded-xl" />}
        {result && s && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Razem dla rodziny" value={<Money value={s.totals.razem} />} live className="col-span-2 md:col-span-1" />
              <StatCard label="Mama" value={<Money value={s.totals.matka} />} />
              {roles.includes("ojciec") && <StatCard label="Tata" value={<Money value={s.totals.ojciec} />} />}
              <StatCard label="Urlop łącznie" value={weeks(totalWeeks)} hint={ent ? `${ent.maternityWeeks} + ${ent.parentalWeeks}${ent.supplementaryWeeks ? ` + ${ent.supplementaryWeeks}` : ""} tyg.` : undefined} />
            </div>

            {!s.validation.ok && (
              <div className="space-y-2">
                {s.validation.errors.map((e) => (
                  <WarningCallout key={e} warning={{ severity: "critical", title: "Plan wymaga poprawy", text: e }} />
                ))}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Oś czasu urlopów</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline periods={s.periods} start={sc.kind === "urodzenie" ? sc.birthDate : sc.acceptDate} />
              </CardContent>
            </Card>

            {s.comparison && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">81,5% za całość czy 100% + 70%?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard className="p-3" label="Wniosek o cały urlop" value={<Money value={s.comparison.longApplication} />} />
                    <StatCard className="p-3" label="Urlopy osobno (100% + 70%)" value={<Money value={s.comparison.separate} />} />
                    <StatCard className="p-3" label="Różnica" value={<Money value={s.comparison.difference} />} />
                  </div>
                  <p className="text-sm">
                    {Math.abs(s.comparison.difference) < 1
                      ? "Oba warianty dają praktycznie tę samą kwotę."
                      : s.comparison.difference > 0
                        ? "Przy tym planie wniosek o cały urlop daje więcej – głównie dlatego, że krótszy rodzicielski jest płatny 81,5% zamiast 70%."
                        : "Przy pełnym urlopie suma jest podobna; wariant 100% + 70% daje wyższe kwoty na początku, a 81,5% – równe wypłaty przez cały okres."}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wypłaty miesiąc po miesiącu</CardTitle>
              </CardHeader>
              <CardContent>
                <MoneyChart data={s.monthly} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Okresy i kwoty</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Okres</TableHead>
                      <TableHead>Kto</TableHead>
                      <TableHead>Od – do</TableHead>
                      <TableHead className="text-right">Dni</TableHead>
                      <TableHead className="text-right">Stawka</TableHead>
                      <TableHead className="text-right">Podstawa</TableHead>
                      <TableHead className="text-right">Miesięcznie</TableHead>
                      <TableHead className="text-right">Razem</TableHead>
                      <TableHead>Wypłaca</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.periods.map((p) => (
                      <TableRow key={p.type + p.parent + p.from + p.rate}>
                        <TableCell>
                          <PeriodBadge type={p.type} />
                          {p.workFraction ? <span className="text-muted-foreground block text-xs">praca {p.workFraction} etatu</span> : null}
                        </TableCell>
                        <TableCell>{p.parent === "matka" ? "Mama" : "Tata"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {p.from} – {p.to}
                        </TableCell>
                        <TableCell className="text-right">{p.days}</TableCell>
                        <TableCell className="text-right">{`${Math.round(p.rate * 1000) / 10}%`.replace(".", ",")}</TableCell>
                        <TableCell className="text-right">
                          <Money value={p.base} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Money value={p.monthlyAmount} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <Money value={p.total} />
                        </TableCell>
                        <TableCell>
                          <PayerBadge payer={p.payer} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {result.warnings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Na co uważać</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.warnings.map((w) => (
                    <WarningCallout key={w.id + w.title} warning={w} />
                  ))}
                </CardContent>
              </Card>
            )}

            <Accordion type="single" collapsible className="print:hidden">
              <AccordionItem value="notes">
                <AccordionTrigger>Jak to policzyliśmy</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <ExplainSteps steps={s.notes} />
                  {roles.map((r) =>
                    result.bases[r] ? (
                      <div key={r} className="space-y-1">
                        <p className="text-sm font-medium">Podstawa – {r === "matka" ? "mama" : "tata"}</p>
                        <ExplainSteps steps={result.bases[r]!.steps} sources={result.bases[r]!.sources} />
                      </div>
                    ) : null,
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex flex-col gap-2 sm:flex-row print:hidden">
              <Button
                onClick={() => {
                  store.updatePlan(plan);
                  toast.success("Plan zapisany – użyjemy go we wnioskach", {
                    action: { label: "Przejdź do wniosków", onClick: () => router.push("/wnioski") },
                  });
                }}
                disabled={!hasStoreData}
              >
                <Save className="size-4" aria-hidden /> Użyj tego planu we wniosku
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" aria-hidden /> Drukuj / PDF
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Stawki i wymiary wg parametrów w wersji {paramsVersion ?? "…"} (panel administracyjny). Wynik ma charakter informacyjny.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
