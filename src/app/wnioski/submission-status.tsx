"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SimulationBadge } from "@/components/simulation-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubmissionResult } from "@/server/mocks/applications";
import { cn } from "@/lib/utils";

/** Simulated status timeline (złożony → przyjęty → w trakcie) driven by the timestamps from the mock API. */
export function SubmissionStatus({ result, onClose }: { result: Pick<SubmissionResult, "caseNumber" | "recipient" | "timeline">; onClose?: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const last = Date.parse(result.timeline[result.timeline.length - 1].at);
  const done = now >= last;

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [done]);

  return (
    <Card className="print:hidden" aria-live="polite">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          Wniosek wysłany <SimulationBadge />
        </CardTitle>
        <CardDescription>
          Numer sprawy: <span className="text-foreground font-mono font-medium">{result.caseNumber}</span> · adresat: {result.recipient}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-3">
          {result.timeline.map((t, i) => {
            const reached = Date.parse(t.at) <= now;
            const current = reached && (i === result.timeline.length - 1 || Date.parse(result.timeline[i + 1].at) > now);
            const Icon = reached ? CheckCircle2 : current ? Loader2 : Circle;
            return (
              <li key={t.status} className="flex gap-3">
                <Icon className={cn("mt-0.5 size-5 shrink-0", reached ? "text-success" : "text-muted-foreground")} aria-hidden />
                <div>
                  <p className={cn("font-medium", !reached && "text-muted-foreground")}>
                    {t.status}
                    {reached && <span className="text-muted-foreground ml-2 text-xs font-normal">{new Date(t.at).toLocaleTimeString("pl-PL")}</span>}
                  </p>
                  {reached && <p className="text-muted-foreground text-sm">{t.note}</p>}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-muted-foreground text-xs">To symulacja – wniosek nie został nigdzie wysłany. Prawdziwy wniosek złóż u pracodawcy, przez PUE/eZUS albo na gov.pl.</p>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Wróć do listy wniosków
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
