"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { SimulationBadge } from "@/components/simulation-badge";
import { Button } from "@/components/ui/button";
import { useCaseStore } from "@/store/caseStore";

// Temporary view; KAN-25 builds the full "Moja sytuacja" screen.
export function SituationPlaceholder() {
  const { displayName, parents, scenario, source } = useCaseStore();
  if (!source) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Moja sytuacja</h1>
        <p className="text-muted-foreground">Brak danych. Zaloguj się (symulacja) albo wprowadź dane ręcznie.</p>
        <Button asChild>
          <Link href="/logowanie">Zaloguj się przez mObywatel</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Moja sytuacja</h1>
          {source === "mobywatel" && <SimulationBadge />}
        </div>
        <LogoutButton />
      </div>
      <p>
        Dane: <strong>{displayName}</strong> – {parents.length === 2 ? "dwoje rodziców" : "jeden rodzic"}, scenariusz: {scenario?.kind}.
      </p>
      <p className="text-muted-foreground text-sm">Pełny ekran z uprawnieniami i ostrzeżeniami powstanie w kolejnym kroku.</p>
    </div>
  );
}
