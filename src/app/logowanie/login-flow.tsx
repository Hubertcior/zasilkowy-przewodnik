"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SimulationBadge } from "@/components/simulation-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParentData, Scenario } from "@/engine/types";
import { useCaseStore } from "@/store/useCaseStore";

interface PersonaSummary {
  id: string;
  name: string;
  summary: string;
  tags: string[];
}

const DATA_ITEMS = [
  "okresy ubezpieczenia (tytuł, daty, rodzaj ubezpieczenia chorobowego)",
  "przychody / podstawa wymiaru składek z ostatnich 12 miesięcy",
  "dane płatnika składek (liczba zgłoszonych do ubezpieczenia chorobowego)",
  "zwolnienia lekarskie e-ZLA",
  "stan rozliczeń (zadłużenie składkowe)",
];

export function LoginFlow() {
  const router = useRouter();
  const setFromPersona = useCaseStore((s) => s.setFromPersona);
  const [personas, setPersonas] = useState<PersonaSummary[] | null>(null);
  const [selected, setSelected] = useState<PersonaSummary | null>(null);
  const [step, setStep] = useState<"choose" | "consent">("choose");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/mock/personas")
      .then((r) => r.json())
      .then(setPersonas)
      .catch(() => toast.error("Nie udało się pobrać listy osób"));
  }, []);

  async function login(p: PersonaSummary) {
    setBusy(true);
    try {
      const res = await fetch("/api/mock/mobywatel/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personaId: p.id }),
      });
      if (!res.ok) throw new Error();
      setSelected(p);
      setStep("consent");
    } catch {
      toast.error("Logowanie nie powiodło się");
    } finally {
      setBusy(false);
    }
  }

  async function fetchData() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/mock/zus/profile");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { persona: { id: string; name: string }; parents: ParentData[]; scenario: Scenario };
      setFromPersona({ personaId: data.persona.id, displayName: data.persona.name, parents: data.parents, scenario: data.scenario });
      toast.success("Dane pobrane (symulacja)");
      router.push("/moja-sytuacja");
    } catch {
      toast.error("Nie udało się pobrać danych");
      setBusy(false);
    }
  }

  if (step === "consent" && selected) {
    return (
      <Card className="mx-auto w-full max-w-xl">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">Pobierz moje dane z ZUS</CardTitle>
            <SimulationBadge />
          </div>
          <CardDescription>
            Zalogowano jako <strong>{selected.name}</strong> (osoba fikcyjna). Za Twoją zgodą pobierzemy z systemów ZUS:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {DATA_ITEMS.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-4 text-xs">
            To symulacja – żadne prawdziwe dane nie są pobierane ani zapisywane na serwerze. Dane trafią tylko do tej karty przeglądarki.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setStep("choose")} disabled={busy}>
            Wróć
          </Button>
          <Button onClick={fetchData} disabled={busy}>
            {busy ? "Pobieram…" : "Wyrażam zgodę – pobierz dane"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Zaloguj się przez mObywatel</h1>
          <SimulationBadge />
        </div>
        <p className="text-muted-foreground max-w-2xl">
          W wersji demonstracyjnej zamiast prawdziwego logowania wybierasz jedną z fikcyjnych osób. Każda ma inną sytuację – zobacz, jak
          przewodnik ustala uprawnienia i wylicza zasiłki.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {personas === null
          ? Array.from({ length: 6 }, (_, i) => <Card key={i} className="h-44 animate-pulse" />)
          : personas.map((p) => (
              <Card key={p.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>{p.summary}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-wrap content-start gap-1.5">
                  {p.tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => login(p)} disabled={busy}>
                    Zaloguj jako {p.name.split(" ")[0]}
                  </Button>
                </CardFooter>
              </Card>
            ))}
      </div>
    </div>
  );
}
