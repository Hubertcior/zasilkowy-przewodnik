import { Calendar, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { AiBadge } from "@/components/ai-badge";
import { EmptyState } from "@/components/empty-state";
import { ExplainSteps } from "@/components/explain-steps";
import { Money } from "@/components/money";
import { PageContainer } from "@/components/page-container";
import { PayerBadge } from "@/components/payer-badge";
import { PERIOD_LABELS, PeriodBadge } from "@/components/period-badge";
import { SimulationBadge } from "@/components/simulation-badge";
import { SourceLink } from "@/components/source-link";
import { StatCard } from "@/components/stat-card";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { WarningCallout } from "@/components/warning-callout";
import type { PeriodType } from "@/engine/types";

export const metadata: Metadata = { title: "Komponenty UI – podgląd", robots: { index: false } };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function UiKitPage() {
  return (
    <PageContainer className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Komponenty UI</h1>
        <p className="text-muted-foreground">Podgląd komponentów wspólnych (strona deweloperska).</p>
      </div>

      <Section title="Przyciski i plakietki">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Główny</Button>
          <Button variant="secondary">Drugorzędny</Button>
          <Button variant="outline">Obrys</Button>
          <Button variant="ghost">Duch</Button>
          <SimulationBadge />
          <AiBadge />
          <PayerBadge payer="ZUS" />
          <PayerBadge payer="platnik" />
          <PayerBadge payer="pracodawca" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((t) => (
            <PeriodBadge key={t} type={t} />
          ))}
        </div>
      </Section>

      <Section title="Kwoty i karty">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Zasiłek miesięcznie" value={<Money value={4922.84} />} hint="81,5% podstawy" icon={<Wallet className="size-4" />} live />
          <StatCard label="Podstawa wymiaru" value={<Money value={6040.3} />} />
          <StatCard label="Urlop łącznie" value="61 tyg." hint="20 macierzyńskiego + 41 rodzicielskiego" icon={<Calendar className="size-4" />} />
        </div>
      </Section>

      <Section title="Ostrzeżenia">
        <div className="space-y-3">
          <WarningCallout warning={{ severity: "critical", title: "Brak ubezpieczenia w dniu porodu", text: "Umowa kończy się przed terminem porodu.", source: "art. 29 ust. 1 ustawy zasiłkowej" }} />
          <WarningCallout warning={{ severity: "warning", title: "Okres wyczekiwania", text: "Prawo do zasiłku chorobowego od 2027-01-20." }} />
          <WarningCallout warning={{ severity: "info", title: "Termin 21 dni", text: "Wniosek o cały urlop do 21 dni po porodzie.", source: "https://www.zus.pl" }} />
        </div>
      </Section>

      <Section title="Kroki wyliczenia i źródła">
        <ExplainSteps
          steps={["Okres: 12 miesięcy przed miesiącem powstania prawa.", "Średnio 7 000,00 zł brutto.", "Pomniejszenie o 13,71%: 6 040,30 zł."]}
          sources={["art. 36 ust. 1 u.z.", "https://www.zus.pl"]}
        />
        <SourceLink source="art. 180 § 1 KP" />
      </Section>

      <Section title="Stepper">
        <Stepper steps={["Sytuacja", "Ubezpieczenie", "Zarobki", "Plan"]} current={1} />
      </Section>

      <Section title="Stan pusty">
        <EmptyState title="Brak danych" action={<Button>Zacznij</Button>}>
          Zaloguj się albo wybierz przykładową sprawę.
        </EmptyState>
      </Section>
    </PageContainer>
  );
}
