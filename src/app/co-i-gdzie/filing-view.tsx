"use client";

import { Building2, CalendarClock, ExternalLink, FileText, Landmark, MonitorSmartphone, Paperclip, Send, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { SourceLink } from "@/components/source-link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { FilingStep } from "@/engine/filing";
import { useCalculation } from "@/hooks/use-calculation";
import { useToday } from "@/hooks/use-today";
import { cn } from "@/lib/utils";

const WHO: Record<FilingStep["who"], string> = { mama: "Mama", tata: "Tata", oboje: "Oboje rodzice", pracodawca: "Pracodawca", zleceniodawca: "Zleceniodawca" };

function WhereBadge({ where }: { where: FilingStep["where"] }) {
  const Icon = where === "ZUS" ? Landmark : where === "USC/gov.pl" ? MonitorSmartphone : Building2;
  return (
    <Badge variant={where === "ZUS" ? "secondary" : "outline"} className="gap-1">
      <Icon className="size-3" aria-hidden /> złóż: {where}
    </Badge>
  );
}

function StepCard({ step, today }: { step: FilingStep; today: string | null }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const overdue = !!(step.deadline && today && step.deadline < today);
  return (
    <Card id={step.id} className="scroll-mt-24">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <WhereBadge where={step.where} />
          <Badge variant="outline" className="gap-1">
            <UserRound className="size-3" aria-hidden /> {WHO[step.who]}
          </Badge>
          {step.deadline && (
            <Badge className={cn("gap-1", overdue ? "bg-destructive text-white" : "bg-primary text-primary-foreground")}>
              <CalendarClock className="size-3" aria-hidden /> {overdue ? "termin minął: " : "do "}
              {step.deadline}
            </Badge>
          )}
        </div>
        <CardTitle className="pt-1 text-base">{step.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>{step.deadlineRule}</p>
        {step.forms.length > 0 && (
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 font-medium">
              <FileText className="size-4" aria-hidden /> Formularze
            </p>
            <ul className="list-disc space-y-0.5 pl-6">
              {step.forms.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {step.attachments.length > 0 && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 font-medium">
              <Paperclip className="size-4" aria-hidden /> Załączniki – lista kontrolna
            </p>
            {step.attachments.map((a, i) => {
              const id = `${step.id}-att-${i}`;
              return (
                <div key={a} className="flex items-start gap-2">
                  <Checkbox id={id} checked={!!done[a]} onCheckedChange={(v) => setDone({ ...done, [a]: v === true })} className="mt-0.5" />
                  <label htmlFor={id} className={cn(done[a] && "text-muted-foreground line-through")}>
                    {a}
                  </label>
                </div>
              );
            })}
          </div>
        )}
        <Accordion type="single" collapsible>
          <AccordionItem value="online" className="border-b-0">
            <AccordionTrigger className="py-2">
              <span className="flex items-center gap-1.5">
                <MonitorSmartphone className="size-4" aria-hidden /> Złóż online: {step.online.channel}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal space-y-1 pl-5">
                {step.online.howTo.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {step.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 underline-offset-2 hover:underline">
              {l.label} <ExternalLink className="size-3" aria-hidden />
            </a>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <SourceLink source={step.source} />
          {step.forms.some((f) => /wniosek|ZAM/i.test(f)) && (
            <Button asChild size="sm" variant="secondary">
              <Link href="/wnioski">
                <Send className="size-4" aria-hidden /> Wypełnij wniosek
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FilingView() {
  const { loading, error, calc, hasData } = useCalculation();
  const today = useToday();

  if (!hasData) {
    return (
      <EmptyState
        title="Najpierw podaj swoją sytuację"
        action={
          <Button asChild>
            <Link href="/">Wybierz sposób</Link>
          </Button>
        }
      >
        Lista dokumentów zależy od formy zatrudnienia, płatnika i terminów – zaloguj się (symulacja), wprowadź dane albo wybierz przykładową sprawę.
      </EmptyState>
    );
  }
  if (loading) return <div className="bg-muted h-96 animate-pulse rounded-xl" aria-busy="true" />;
  if (error || !calc) return <p className="text-destructive">Nie udało się przygotować listy: {error}</p>;

  const steps = calc.filing;
  if (steps.length === 0) {
    return <EmptyState title="Brak kroków do wykonania">Przy obecnych danych nie przysługuje zasiłek – sprawdź „Moja sytuacja” i ostrzeżenia.</EmptyState>;
  }
  const dated = steps.filter((s) => s.deadline);

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" aria-hidden /> Terminy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dated.length === 0 ? (
              <p className="text-muted-foreground text-sm">Terminy pojawią się, gdy podasz datę porodu lub plan urlopów.</p>
            ) : (
              <ol className="relative space-y-4 border-l pl-4">
                {dated.map((s) => (
                  <li key={s.id} className="relative">
                    <span className={cn("absolute top-1 -left-[21px] size-2.5 rounded-full", today && s.deadline! < today ? "bg-destructive" : "bg-primary")} aria-hidden />
                    <a href={`#${s.id}`} className="block hover:underline">
                      <span className="text-muted-foreground block text-xs">{s.deadline}</span>
                      <span className="text-sm">{s.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        {steps.map((s) => (
          <StepCard key={s.id} step={s} today={today} />
        ))}
        <p className="text-muted-foreground text-xs">
          Wzory formularzy: <a className="underline" href="https://www.zus.pl/wzory-formularzy" target="_blank" rel="noopener noreferrer">zus.pl/wzory-formularzy</a>. Terminy wniosków o urlopy wg Kodeksu pracy i rozporządzenia Dz.U. 2025 poz. 322.
        </p>
      </div>
    </div>
  );
}
