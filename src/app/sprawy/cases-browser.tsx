"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CaseFile } from "@/engine/types";
import { useCaseStore } from "@/store/useCaseStore";
import { AiBadge } from "@/components/ai-badge";
import { PdfExtract } from "./pdf-extract";

interface CaseSummary {
  id: string;
  title: string;
  description: string;
  synthetic: boolean;
  origin: "synthetic" | "private";
  hasExpected: boolean;
}

interface ApiIssue {
  path?: (string | number)[];
  message: string;
}

export function CasesBrowser() {
  const router = useRouter();
  const setFromCase = useCaseStore((s) => s.setFromCase);
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  // [AI] PDF reading is shown only when the server has ANTHROPIC_API_KEY (GET /api/cases/extract).
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/cases/extract")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((j: { enabled: boolean }) => setAiEnabled(j.enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then(setCases)
      .catch(() => toast.error("Nie udało się pobrać listy spraw"));
  }, []);

  function open(c: CaseFile, origin: "synthetic" | "private" | "upload") {
    setFromCase(c, origin);
    router.push("/moja-sytuacja");
  }

  async function choose(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as CaseFile & { origin: "synthetic" | "private" };
      open(data, data.origin);
    } catch {
      toast.error("Nie udało się wczytać sprawy");
      setBusy(null);
    }
  }

  async function upload(file: File) {
    setBusy("upload");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/cases/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        const issues = (data.issues as ApiIssue[] | undefined)?.slice(0, 3).map((i) => `${i.path?.join(".") || "plik"}: ${i.message}`);
        toast.error("Plik nie jest poprawną sprawą", { description: issues?.join("\n") });
        setBusy(null);
        return;
      }
      toast.success("Sprawa wczytana (nie jest zapisywana na serwerze)");
      open(data as CaseFile, "upload");
    } catch {
      toast.error("Nie udało się wgrać pliku");
      setBusy(null);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Przykładowe sprawy</h1>
        <p className="text-muted-foreground max-w-3xl">
          Wybierz sprawę albo wgraj własną (plik .json w formacie opisanym w dokumentacji). Zobaczysz, czy osoba ma ubezpieczenie, jaki zasiłek jej
          przysługuje – i porównanie z wynikiem ZUS, jeśli sprawa go zawiera.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <Button onClick={() => fileRef.current?.click()} disabled={busy !== null}>
          {busy === "upload" ? "Wczytuję…" : "Wgraj sprawę (.json)"}
        </Button>
        <Button variant="outline" onClick={() => (aiEnabled ? setAiOpen(true) : setPdfOpen(true))}>
          Wgraj PDF {aiEnabled && <AiBadge className="ml-1" />}
        </Button>
      </div>
      {aiOpen && <PdfExtract onCancel={() => setAiOpen(false)} onConfirm={(c) => open(c, "upload")} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cases === null
          ? Array.from({ length: 6 }, (_, i) => <Card key={i} className="h-48 animate-pulse" />)
          : cases.map((c) => (
              <Card key={c.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex flex-wrap gap-1.5">
                    {c.origin === "private" ? (
                      <Badge>Sprawa testowa ZUS (lokalnie)</Badge>
                    ) : (
                      <Badge variant="secondary">Syntetyczna</Badge>
                    )}
                    {c.hasExpected && <Badge variant="outline">z wynikiem ZUS</Badge>}
                  </div>
                  <CardTitle className="pt-1">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <CardDescription className="line-clamp-5">{c.description}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="secondary" onClick={() => choose(c.id)} disabled={busy !== null}>
                    {busy === c.id ? "Wczytuję…" : "Sprawdź tę sprawę"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
      </div>

      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odczyt dokumentów PDF</DialogTitle>
            <DialogDescription>
              Automatyczny odczyt wniosków i zaświadczeń (ZAM, Z-3, Z-3a) przez AI nie jest włączony na tym serwerze (brak klucza API). Wprowadź dane
              ręcznie – formularz ma pola odpowiadające zaświadczeniu Z-3 i wnioskowi ZAM.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild>
              <Link href="/kreator">Przejdź do formularza</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
