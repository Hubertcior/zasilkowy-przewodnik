"use client";

import { Baby, Calculator, CheckCircle2, FileText, FolderOpen, Send, Smartphone, XCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CaseComparison } from "@/components/case-comparison";
import { EmptyState } from "@/components/empty-state";
import { ExplainSteps } from "@/components/explain-steps";
import { LogoutButton } from "@/components/logout-button";
import { Money } from "@/components/money";
import { PayerBadge } from "@/components/payer-badge";
import { PeriodBadge } from "@/components/period-badge";
import { SimulationBadge } from "@/components/simulation-badge";
import { SourceLink } from "@/components/source-link";
import { StatCard } from "@/components/stat-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarningCallout } from "@/components/warning-callout";
import type { BaseResult } from "@/engine/base";
import type { CalculateResult, PregnancyCalcResult, RateVariants } from "@/engine/calculate";
import type { EligibilityResult } from "@/engine/eligibility";
import type { ParentData, Scenario } from "@/engine/types";
import { useCalculation } from "@/hooks/use-calculation";
import { useCaseStore } from "@/store/useCaseStore";

type Role = "matka" | "ojciec";
const ROLE_LABEL: Record<Role, string> = { matka: "Mama", ojciec: "Tata" };
const TITLE_LABEL = { umowa_o_prace: "Umowa o pracę", zlecenie: "Umowa zlecenie", dzialalnosc: "Działalność gospodarcza", inne: "Inny tytuł" } as const;
const SICKNESS_LABEL = { obowiazkowe: "obowiązkowe", dobrowolne: "dobrowolne", brak: "brak" } as const;

function scenarioLabel(s: Scenario): string {
  switch (s.kind) {
    case "ciaza":
      return `Ciąża – przewidywany termin porodu ${s.dueDate}`;
    case "urodzenie":
      return `Poród ${s.birthDate}${s.children > 1 ? ` – ${s.children} dzieci` : ""}${s.zaZyciem ? ", „Za życiem”" : ""}${s.prematurity ? ", wcześniak" : ""}`;
    case "adopcja":
      return `Adopcja – przyjęcie dziecka ${s.acceptDate}`;
    case "piecza":
      return `Rodzina zastępcza – przyjęcie dziecka ${s.acceptDate}`;
  }
}

function Section({ title, icon, children, description }: { title: string; icon?: ReactNode; children: ReactNode; description?: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function ParentColumn({ parent, e, base, rates, kind }: { parent: ParentData; e: EligibilityResult; base?: BaseResult; rates?: RateVariants; kind: Scenario["kind"] }) {
  const p = e.activePeriod;
  const insured = e.insuredOnDate;
  const fem = parent.role === "matka";
  return (
    <div className="space-y-4">
      <Section title="Ubezpieczenie">
        <div
          className={insured ? "bg-success-soft flex items-start gap-3 rounded-xl p-4" : "bg-critical-soft flex items-start gap-3 rounded-xl p-4"}
          role="status"
        >
          {insured ? <CheckCircle2 className="text-success size-7 shrink-0" aria-hidden /> : <XCircle className="text-destructive size-7 shrink-0" aria-hidden />}
          <div>
            <p className="text-lg font-semibold">
              {insured ? `${fem ? "Jesteś ubezpieczona" : "Jesteś ubezpieczony"} chorobowo` : "Brak ubezpieczenia chorobowego"}
            </p>
            <p className="text-muted-foreground text-sm">
              w dniu {kind === "adopcja" || kind === "piecza" ? "przyjęcia dziecka" : kind === "ciaza" ? "przewidywanego porodu" : "porodu"} ({e.checkedOn})
            </p>
          </div>
        </div>
        {p && (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Tytuł</dt>
            <dd>{TITLE_LABEL[p.title]}</dd>
            <dt className="text-muted-foreground">Chorobowe</dt>
            <dd>{SICKNESS_LABEL[p.sickness]}</dd>
            <dt className="text-muted-foreground">Od kiedy</dt>
            <dd>
              {p.from}
              {p.to ? ` do ${p.to}` : ""}
            </dd>
            {p.payerName && (
              <>
                <dt className="text-muted-foreground">Płatnik</dt>
                <dd>{p.payerName}</dd>
              </>
            )}
          </dl>
        )}
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {e.reasons.slice(0, 4).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Section>

      {(e.maternityEligible || insured) && (
        <Section title="Kto wypłaca zasiłek">
          <PayerBadge payer={e.payer} />
          <p className="text-sm">{e.payerReason}</p>
          <p className="text-muted-foreground text-sm">{e.whereToFile}</p>
        </Section>
      )}

      {base && base.base > 0 && (e.maternityEligible || insured) && (
        <Section title="Podstawa wymiaru zasiłku">
          <StatCard label="Podstawa miesięcznie" value={<Money value={base.base} />} hint={base.adjusted === "minimum" ? "podwyższona do minimum" : base.adjusted === "cap" ? "ograniczona do limitu" : undefined} live />
          {rates && e.maternityEligible && (
            <div className="grid gap-2 sm:grid-cols-3">
              <StatCard className="p-3" label={kind === "adopcja" || kind === "piecza" ? "Wniosek o cały urlop" : "Wniosek o cały urlop (81,5%)"} value={<Money value={rates.longApplication} />} />
              <StatCard className="p-3" label="Macierzyński 100%" value={<Money value={rates.maternity100} />} />
              <StatCard className="p-3" label="Rodzicielski 70%" value={<Money value={rates.parental70} />} />
            </div>
          )}
          <Accordion type="single" collapsible>
            <AccordionItem value="steps">
              <AccordionTrigger>Jak to policzyliśmy – krok po kroku</AccordionTrigger>
              <AccordionContent>
                <ExplainSteps steps={base.steps} sources={base.sources} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>
      )}
    </div>
  );
}

function PregnancySection({ preg, mother }: { preg: PregnancyCalcResult; mother: EligibilityResult }) {
  return (
    <Section
      title="W ciąży"
      icon={<Baby className="text-primary size-5" aria-hidden />}
      description="Gdybyś od dziś do porodu była na zwolnieniu lekarskim z kodem „B” (ciąża):"
    >
      {preg.eligible ? (
        <>
          <div className="flex flex-wrap gap-2">
            {preg.periods.map((p) => (
              <div key={p.type + p.from} className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                <PeriodBadge type={p.type} />
                <span>
                  {p.from} – {p.to} ({p.days} dni)
                </span>
                <span>
                  <Money value={p.monthlyAmount} /> / mies. · <PayerBadge payer={p.payer} />
                </span>
              </div>
            ))}
          </div>
          {preg.periods.length > 0 && preg.periods[0].type !== "zasilek_wys_macierzynskiego" && (
            <p className="text-sm">
              Okres zasiłkowy w ciąży: wykorzystane {preg.daysUsed} z {preg.daysUsed + preg.daysLeft} dni, zostaje {preg.daysLeft}.
            </p>
          )}
        </>
      ) : (
        <div className="bg-critical-soft rounded-xl p-4 text-sm">
          <p className="font-medium">Zasiłek chorobowy w ciąży nie przysługuje.</p>
        </div>
      )}
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {preg.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {preg.info.map((i) => (
        <p key={i} className="text-muted-foreground text-sm">
          {i}
        </p>
      ))}
      {!preg.eligible && !mother.insuredOnDate && (
        <p className="text-sm">
          <strong>Co możesz zrobić:</strong> przy zleceniu lub działalności zgłoś dobrowolne ubezpieczenie chorobowe (ZUS ZUA/ZZA). Prawo do zasiłku chorobowego pojawi się po 90 dniach, a do macierzyńskiego wystarczy ubezpieczenie w dniu porodu.
        </p>
      )}
      <SourceLink source={preg.sources[0]} />
    </Section>
  );
}

function AfterBirth({ calc }: { calc: CalculateResult }) {
  const e = calc.entitlement;
  const anyEligible = Object.values(calc.eligibility).some((x) => x?.maternityEligible);
  const adoption = e.maternityKind === "na_warunkach_macierzynskiego";
  const items = [
    { label: adoption ? "Na warunkach macierzyńskiego" : "Macierzyński", value: e.maternityWeeks },
    { label: "Rodzicielski", value: e.parentalWeeks, hint: e.nonTransferablePerParent ? `w tym ${e.nonTransferablePerParent} tyg. dla każdego z rodziców` : undefined },
    ...(e.supplementaryWeeks ? [{ label: "Uzupełniający", value: e.supplementaryWeeks }] : []),
    { label: "Ojcowski", value: e.paternityWeeks, hint: e.paternityDeadline ? `do ${e.paternityDeadline}` : undefined },
  ];
  return (
    <Section
      title={adoption ? "Po przyjęciu dziecka" : "Po porodzie"}
      description={e.eligible ? "Wymiar urlopów i zasiłku macierzyńskiego." : undefined}
    >
      {!anyEligible && (
        <div className="bg-critical-soft rounded-xl p-4 text-sm">
          <p className="font-medium">Zasiłek macierzyński nie przysługuje – brak ubezpieczenia chorobowego w dniu {adoption ? "przyjęcia dziecka" : "porodu"}.</p>
          <p>Poniżej wymiar urlopów, jaki przysługiwałby osobie ubezpieczonej (pracownik ma prawo do urlopu, ale zasiłek wymaga ubezpieczenia chorobowego).</p>
        </div>
      )}
      {e.eligible ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((i) => (
            <StatCard key={i.label} label={i.label} value={`${Number.isInteger(i.value) ? i.value : i.value.toFixed(1).replace(".", ",")} tyg.`} hint={i.hint} />
          ))}
        </div>
      ) : null}
      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
        {e.notes.slice(0, 3).map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      {calc.schedule.comparison && calc.schedule.totals.razem > 0 && (
        <p className="text-sm">
          Łącznie w planie domyślnym: <Money value={calc.schedule.totals.razem} className="font-semibold" /> (wariant z wnioskiem o cały urlop:{" "}
          <Money value={calc.schedule.comparison.longApplication} />, urlopy osobno: <Money value={calc.schedule.comparison.separate} />).
        </p>
      )}
      <Button asChild>
        <Link href="/kalkulator">
          <Calculator className="size-4" aria-hidden /> Zaplanuj w kalkulatorze
        </Link>
      </Button>
    </Section>
  );
}

export function SituationView() {
  const { source, displayName, parents, scenario, caseFile, caseOrigin } = useCaseStore();
  const { loading, error, calc, pregnancy, hasData } = useCalculation();

  if (!source || !hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Moja sytuacja</h1>
        <EmptyState
          title="Brak danych"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/logowanie">
                  <Smartphone className="size-4" aria-hidden /> mObywatel (symulacja)
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/kreator">Wprowadź dane</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/sprawy">
                  <FolderOpen className="size-4" aria-hidden /> Przykładowa sprawa
                </Link>
              </Button>
            </div>
          }
        >
          Zaloguj się (symulacja), wprowadź dane albo wybierz przykładową sprawę, a pokażemy Twoje uprawnienia.
        </EmptyState>
      </div>
    );
  }

  const roles = parents.map((p) => p.role);
  const sourceLabel = source === "mobywatel" ? "dane z ZUS (symulacja)" : source === "sprawa" ? (caseOrigin === "private" ? "sprawa testowa ZUS (lokalnie)" : "przykładowa sprawa") : "dane wprowadzone samodzielnie";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Moja sytuacja</h1>
            {source === "mobywatel" && <SimulationBadge />}
          </div>
          <p className="text-muted-foreground">
            {displayName} · {sourceLabel}
          </p>
          {scenario && <Badge variant="secondary">{scenarioLabel(scenario)}</Badge>}
        </div>
        <LogoutButton />
      </div>

      {loading && <div className="bg-muted h-64 animate-pulse rounded-xl" aria-busy="true" aria-label="Liczę uprawnienia…" />}
      {error && <p className="text-destructive">Nie udało się policzyć uprawnień: {error}</p>}

      {calc && (
        <div className="space-y-6" aria-live="polite">
          {calc.warnings.some((w) => w.severity === "critical") && (
            <div className="space-y-2">
              {calc.warnings
                .filter((w) => w.severity === "critical")
                .map((w) => (
                  <WarningCallout key={w.id + w.title} warning={w} />
                ))}
            </div>
          )}

          {roles.length > 1 ? (
            <>
              <Tabs defaultValue={roles[0]} className="lg:hidden">
                <TabsList className="w-full">
                  {roles.map((r) => (
                    <TabsTrigger key={r} value={r} className="flex-1">
                      {ROLE_LABEL[r]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {parents.map((p) => (
                  <TabsContent key={p.role} value={p.role} className="pt-2">
                    <ParentColumn parent={p} e={calc.eligibility[p.role]!} base={calc.bases[p.role]} rates={calc.rateVariants[p.role]} kind={scenario!.kind} />
                  </TabsContent>
                ))}
              </Tabs>
              <div className="hidden gap-6 lg:grid lg:grid-cols-2">
                {parents.map((p) => (
                  <div key={p.role} className="space-y-2">
                    <h2 className="text-lg font-semibold">{ROLE_LABEL[p.role]}</h2>
                    <ParentColumn parent={p} e={calc.eligibility[p.role]!} base={calc.bases[p.role]} rates={calc.rateVariants[p.role]} kind={scenario!.kind} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <ParentColumn parent={parents[0]} e={calc.eligibility[parents[0].role]!} base={calc.bases[parents[0].role]} rates={calc.rateVariants[parents[0].role]} kind={scenario!.kind} />
              <div className="space-y-4">{pregnancy && <PregnancySection preg={pregnancy} mother={calc.eligibility[parents[0].role]!} />}</div>
            </div>
          )}

          {roles.length > 1 && pregnancy && calc.eligibility.matka && <PregnancySection preg={pregnancy} mother={calc.eligibility.matka} />}

          <AfterBirth calc={calc} />

          {calc.warnings.some((w) => w.severity !== "critical") && (
            <Section title="Uważaj na">
              {calc.warnings
                .filter((w) => w.severity !== "critical")
                .map((w) => (
                  <WarningCallout key={w.id + w.title} warning={w} />
                ))}
            </Section>
          )}

          {caseFile?.expected && <CaseComparison caseFile={caseFile} />}

          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild size="lg">
              <Link href="/kalkulator">
                <Calculator className="size-4" aria-hidden /> Kalkulator
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dokumenty">
                <FileText className="size-4" aria-hidden /> Co i gdzie złożyć
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/wnioski">
                <Send className="size-4" aria-hidden /> Wnioski
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
