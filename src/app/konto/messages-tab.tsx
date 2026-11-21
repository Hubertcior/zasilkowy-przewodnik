"use client";

import { Clock, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SimulationBadge } from "@/components/simulation-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PUE_CATEGORIES, PUE_CATEGORY_LABEL, type PueCategory, type PueThread } from "@/lib/pue";

async function fetchThreads(): Promise<PueThread[] | null> {
  const res = await fetch("/api/mock/pue/wiadomosc");
  return res.ok ? ((await res.json()) as { threads: PueThread[] }).threads : null;
}

/** "Zapytaj ZUS" (simulated PUE messages): question form + threads; answers arrive after a few seconds. */
export function MessagesTab() {
  const [threads, setThreads] = useState<PueThread[]>([]);
  const [category, setCategory] = useState<PueCategory>("macierzynski");
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => fetchThreads().then((ts) => ts && setThreads(ts)), []);

  useEffect(() => {
    void fetchThreads().then((ts) => ts && setThreads(ts));
  }, []);

  // Poll while an answer is pending.
  const pending = threads.some((t) => t.status === "oczekuje");
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(load, 1500);
    return () => clearInterval(id);
  }, [pending, load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/mock/pue/wiadomosc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, subject: subject || undefined, question }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.issues?.[0]?.message ?? json?.message ?? `Błąd ${res.status}`);
      setThreads((ts) => [json.thread as PueThread, ...ts]);
      setSubject("");
      setQuestion("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="lg:self-start">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Zapytaj ZUS <SimulationBadge />
          </CardTitle>
          <CardDescription>Masz wątpliwości? Zadaj pytanie. W symulacji odpowiedź przychodzi po kilku sekundach i jest szablonem, nie stanowiskiem ZUS.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={send} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pue-cat">Kategoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PueCategory)}>
                <SelectTrigger id="pue-cat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PUE_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pue-subject">Temat (opcjonalnie)</Label>
              <Input id="pue-subject" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pue-question">Pytanie</Label>
              <textarea
                id="pue-question"
                required
                minLength={5}
                maxLength={2000}
                rows={5}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Np. Czy przy zadłużeniu składkowym dostanę zasiłek macierzyński?"
                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={sending || question.trim().length < 5}>
              <Send aria-hidden /> {sending ? "Wysyłam…" : "Wyślij pytanie"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3" aria-label="Wątki">
        <h2 className="text-sm font-medium">Twoje wątki</h2>
        {threads.length === 0 && <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">Nie masz jeszcze wiadomości.</p>}
        {threads.map((t) => (
          <Card key={t.id} size="sm">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                {t.subject}
                <Badge variant="secondary">{PUE_CATEGORY_LABEL[t.category]}</Badge>
                {t.status === "oczekuje" ? (
                  <Badge variant="outline">
                    <Clock aria-hidden /> oczekuje na odpowiedź
                  </Badge>
                ) : (
                  <Badge>odpowiedziano</Badge>
                )}
              </CardTitle>
              <CardDescription>{new Date(t.createdAt).toLocaleString("pl-PL")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="bg-muted rounded-lg p-3 whitespace-pre-line">{t.question}</p>
              {t.answer && (
                <div className="border-primary/40 space-y-1 border-l-2 pl-3" aria-live="polite">
                  <p className="text-muted-foreground text-xs">Odpowiedź (symulacja)</p>
                  <p className="whitespace-pre-line">{t.answer}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
