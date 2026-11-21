"use client";

import { CalendarClock, ExternalLink, FilePlus2, FileText, FolderOpen, Inbox } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { SimulationBadge } from "@/components/simulation-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Params } from "@/engine/params";
import { FORMS, getForm, recommendForms, type Role } from "@/forms";
import { BIRTH_CERT_GOV_URL } from "@/forms/birth-certificate";
import type { FormContext } from "@/forms/types";
import { useCalculation } from "@/hooks/use-calculation";
import { useToday } from "@/hooks/use-today";
import { currentStatus } from "@/server/mocks/applications";
import { useApplicationsStore } from "@/store/useApplicationsStore";
import { useCaseStore } from "@/store/useCaseStore";
import { FormWizard } from "./form-wizard";

const ROLE_LABEL: Record<Role, string> = { matka: "Mama", ojciec: "Tata" };

/** /wnioski – recommended applications for the case, wizard, preview and simulated sending (KAN-30). */
export function ApplicationsView() {
  const { parents, scenario, source, displayName } = useCaseStore();
  const { calc, loading, error, hasData } = useCalculation();
  const today = useToday();
  const submitted = useApplicationsStore((s) => s.submitted);
  const [deadlines, setDeadlines] = useState<Params["deadlines"] | null>(null);
  // undefined = still loading (logged-in persona), null = not available.
  const [pesel, setPesel] = useState<string | null | undefined>(undefined);
  const [selected, setSelected] = useState<{ formId: string; role: Role } | null>(null);

  useEffect(() => {
    void fetch("/api/params")
      .then((r) => r.json() as Promise<Params>)
      .then((p) => setDeadlines(p.deadlines));
  }, []);

  // PESEL comes only from the simulated ZUS profile (logged-in persona).
  useEffect(() => {
    if (source !== "mobywatel") return;
    void fetch("/api/mock/zus/profile")
      .then((r) => (r.ok ? (r.json() as Promise<{ persona: { pesel: string } }>) : null))
      .then((p) => setPesel(p?.persona.pesel ?? null))
      .catch(() => setPesel(null));
  }, [source]);

  // Deep link: /wnioski?formularz=zam&rola=ojciec
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get("formularz");
    const f = id ? getForm(id) : undefined;
    if (id && f) {
      const r = f.applicant !== "rodzic" ? f.applicant : q.get("rola") === "ojciec" ? "ojciec" : "matka";
      queueMicrotask(() => setSelected({ formId: id, role: r }));
    }
  }, []);

  const ctx: FormContext | null = useMemo(
    () =>
      calc && scenario && today && deadlines && (source !== "mobywatel" || pesel !== undefined)
        ? {
            today,
            parents,
            scenario,
            plan: calc.plan,
            periods: calc.schedule.periods,
            person: source === "mobywatel" ? { name: displayName, pesel: pesel ?? undefined } : undefined,
            deadlines,
          }
        : null,
    [calc, scenario, today, deadlines, parents, source, displayName, pesel],
  );
  const recs = useMemo(() => (calc ? recommendForms(calc.filing, calc.plan) : []), [calc]);

  const header = (
    <header className="space-y-2 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Wnioski</h1>
        <SimulationBadge />
      </div>
      <p className="text-muted-foreground max-w-3xl text-sm">
        Wypełnij wnioski o urlopy do pracodawcy, wniosek ZAM o zasiłek macierzyński i wniosek o odpis aktu urodzenia. Dane bierzemy z Twojej sprawy i planu
        z kalkulatora. Wysyłka jest symulowana.
      </p>
    </header>
  );

  if (!hasData) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<FolderOpen />}
          title="Najpierw podaj swoją sytuację"
          action={
            <Button asChild>
              <Link href="/">Wybierz, jak zacząć</Link>
            </Button>
          }
        >
          Zaloguj się (symulacja mObywatela), wpisz dane albo wczytaj przykładową sprawę. Potem wypełnimy wnioski za Ciebie.
        </EmptyState>
      </div>
    );
  }

  if (loading || !ctx) return <div className="space-y-6">{header}{error ? <p className="text-destructive">{error}</p> : <p className="text-muted-foreground">Przygotowuję wnioski…</p>}</div>;

  const def = selected && getForm(selected.formId);
  if (def && selected) {
    return (
      <div className="space-y-6">
        <FormWizard key={`${selected.formId}-${selected.role}`} def={def} ctx={ctx} role={selected.role} onClose={() => setSelected(null)} />
      </div>
    );
  }

  const recommendedIds = new Set(recs.map((r) => `${r.formId}:${r.role}`));
  const hasFather = parents.some((p) => p.role === "ojciec");

  return (
    <div className="space-y-8">
      {header}

      <section className="space-y-3" aria-labelledby="rec-h">
        <h2 id="rec-h" className="text-lg font-semibold">
          Zalecane w Twojej sytuacji
        </h2>
        {recs.length === 0 ? (
          <p className="text-muted-foreground text-sm">Dla tej sytuacji nie ma wniosków do złożenia (sprawdź „Co i gdzie złożyć”).</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recs.map((r) => {
              const f = getForm(r.formId)!;
              const late = r.deadline && r.deadline < ctx.today;
              return (
                <Card key={`${r.formId}-${r.role}`} size="sm">
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      <FileText className="size-4" aria-hidden /> {f.short}
                    </CardTitle>
                    <CardDescription>
                      {ROLE_LABEL[r.role]} · {f.recipient === "płatnik zasiłku" ? "pracodawca albo ZUS" : f.recipient} · krok: {r.why}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-muted-foreground space-y-2 text-sm">
                    <p>{f.description}</p>
                    {r.deadline && (
                      <Badge variant={late ? "destructive" : "secondary"}>
                        <CalendarClock aria-hidden /> {late ? "termin minął" : "termin"}: {r.deadline}
                      </Badge>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => setSelected({ formId: r.formId, role: r.role })}>
                      <FilePlus2 aria-hidden /> Wypełnij
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="all-h">
        <h2 id="all-h" className="text-lg font-semibold">
          Wszystkie wzory
        </h2>
        <ul className="divide-y rounded-xl border">
          {FORMS.map((f) => {
            const roles: Role[] = f.applicant === "rodzic" ? (hasFather ? ["matka", "ojciec"] : ["matka"]) : [f.applicant];
            return (
              <li key={f.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">
                    {f.title}
                    {roles.some((r) => recommendedIds.has(`${f.id}:${r}`)) && (
                      <Badge variant="secondary" className="ml-2">
                        zalecany
                      </Badge>
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm">{f.description}</p>
                  {f.id === "odpis-aktu" && (
                    <a href={BIRTH_CERT_GOV_URL} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 text-sm underline underline-offset-2">
                      Prawdziwa usługa: rejestr stanu cywilnego na gov.pl <ExternalLink className="size-3" aria-hidden />
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {roles.map((r) => (
                    <Button key={r} size="sm" variant="outline" onClick={() => setSelected({ formId: f.id, role: r })}>
                      {roles.length > 1 ? ROLE_LABEL[r] : "Wypełnij"}
                    </Button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="sent-h">
        <h2 id="sent-h" className="flex items-center gap-2 text-lg font-semibold">
          Wysłane wnioski <SimulationBadge />
        </h2>
        {submitted.length === 0 ? (
          <EmptyState icon={<Inbox />} title="Nie wysłano jeszcze żadnego wniosku" className="py-8" />
        ) : (
          <ul className="divide-y rounded-xl border">
            {submitted.map((s) => (
              <li key={s.caseNumber} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-mono">{s.caseNumber}</span> · {ROLE_LABEL[s.role]} · {s.recipient} · {new Date(s.submittedAt).toLocaleString("pl-PL")}
                  </p>
                </div>
                <Badge>{currentStatus(s.timeline).status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
