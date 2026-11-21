"use client";

import { Download, History, LogOut, RotateCcw, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarningCallout } from "@/components/warning-callout";
import { round2 } from "@/engine/money";
import { ParamsSchema, type Params } from "@/engine/params";
import { labelFor, TABS } from "./labels";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
interface HistoryEntry {
  at: string;
  author: string;
  action: "put" | "reset";
  version: string;
  note?: string;
  params: Params;
}

function getAt(obj: Json, path: string[]): Json {
  return path.reduce<Json>((o, k) => (o as Record<string, Json>)[k], obj);
}
function setAt(obj: Json, path: string[], value: Json): Json {
  if (path.length === 0) return value;
  const [k, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...(obj as Record<string, Json>) };
  (copy as Record<string, Json>)[k] = setAt((obj as Record<string, Json>)[k], rest, value);
  return copy;
}
function flatten(o: Json, prefix = ""): Record<string, string> {
  if (o === null || typeof o !== "object" || Array.isArray(o)) return { [prefix]: JSON.stringify(o) };
  return Object.entries(o).reduce<Record<string, string>>((acc, [k, v]) => ({ ...acc, ...flatten(v, prefix ? `${prefix}.${k}` : k) }), {});
}
function diff(a: Json, b: Json): string[] {
  const fa = flatten(a);
  const fb = flatten(b);
  return [...new Set([...Object.keys(fa), ...Object.keys(fb)])].filter((k) => fa[k] !== fb[k] && k !== "version").map((k) => `${k}: ${fa[k] ?? "—"} → ${fb[k] ?? "—"}`);
}

function FieldEditor({ path, value, onChange }: { path: string[]; value: Json; onChange: (path: string[], v: Json) => void }) {
  const key = path.join(".");
  const { label, desc } = labelFor(key);
  const id = `f-${key}`;
  if (Array.isArray(value)) {
    return <JsonArea id={id} label={label} desc={desc} value={value} onChange={(v) => onChange(path, v)} />;
  }
  if (value !== null && typeof value === "object") {
    return (
      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-semibold">{label}</legend>
        {desc && <p className="text-muted-foreground text-xs">{desc}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(value).map(([k, v]) => (
            <FieldEditor key={k} path={[...path, k]} value={v} onChange={onChange} />
          ))}
        </div>
      </fieldset>
    );
  }
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Switch id={id} checked={value} onCheckedChange={(v) => onChange(path, v)} />
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={typeof value === "number" ? "number" : "text"}
        step="any"
        value={value === null ? "" : String(value)}
        onChange={(e) => onChange(path, typeof value === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value)}
      />
      {desc && <p className="text-muted-foreground text-xs">{desc}</p>}
    </div>
  );
}

function JsonArea({ id, label, desc, value, onChange }: { id: string; label: string; desc?: string; value: Json; onChange: (v: Json) => void }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [bad, setBad] = useState(false);
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        className="border-input bg-background min-h-64 w-full rounded-md border p-2 font-mono text-xs"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setBad(false);
          } catch {
            setBad(true);
          }
        }}
      />
      {bad ? <p className="text-destructive text-xs">Niepoprawny JSON – zmiany nie zostaną zapisane.</p> : desc && <p className="text-muted-foreground text-xs">{desc}</p>}
    </div>
  );
}

/** Example for 7000 zł gross: monthly amounts with given params. */
function impact(p: Params) {
  const base = round2(7000 * (1 - p.contributionRate));
  return { base, maternity: round2(base * p.rates.maternity), parental: round2(base * p.rates.parental), long: round2(base * p.rates.longApplication) };
}

async function fetchAll() {
  const [params, history, s] = await Promise.all([
    fetch("/api/params").then((r) => r.json() as Promise<Params>),
    fetch("/api/params/history").then((r) => r.json() as Promise<HistoryEntry[]>),
    fetch("/api/admin/session"),
  ]);
  if (s.status === 401) return null;
  return { params, history, session: (await s.json()) as { store: string; persistent: boolean; defaultPassword: boolean } };
}

export function AdminPanel() {
  const router = useRouter();
  const [saved, setSaved] = useState<Params | null>(null);
  const [draft, setDraft] = useState<Json | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [session, setSession] = useState<{ store: string; persistent: boolean; defaultPassword: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = useCallback(
    (d: Awaited<ReturnType<typeof fetchAll>>) => {
      if (!d) {
        router.replace("/admin/login");
        return;
      }
      setSaved(d.params);
      setDraft(d.params as unknown as Json);
      setHistory(d.history);
      setSession(d.session);
    },
    [router],
  );
  const load = useCallback(async () => apply(await fetchAll()), [apply]);

  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then((d) => !cancelled && apply(d))
      .catch(() => toast.error("Nie udało się wczytać parametrów"));
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const validation = useMemo(() => (draft ? ParamsSchema.safeParse(draft) : null), [draft]);
  const changes = useMemo(() => (saved && draft ? diff(saved as unknown as Json, draft) : []), [saved, draft]);

  if (!draft || !saved) return <div className="bg-muted h-96 animate-pulse rounded-xl" />;
  const onChange = (path: string[], v: Json) => setDraft((d) => setAt(d!, path, v));

  async function save() {
    if (!validation?.success) {
      toast.error("Popraw błędy walidacji");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/params", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-change-note": encodeURIComponent(note) },
      body: JSON.stringify(validation.data),
    });
    setBusy(false);
    if (res.status === 401) return router.replace("/admin/login");
    if (!res.ok) return toast.error("Serwer odrzucił parametry");
    const p = await res.json();
    toast.success(`Zapisano wersję ${p.version}`);
    setNote("");
    await load();
  }

  async function reset() {
    if (!window.confirm("Przywrócić domyślne parametry? Bieżące wartości zostaną zastąpione (pozostaną w historii).")) return;
    const res = await fetch("/api/params/reset", { method: "POST" });
    if (!res.ok) return toast.error("Nie udało się przywrócić");
    toast.success("Przywrócono domyślne parametry");
    await load();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `parametry-${(draft as Record<string, Json>).version}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(file: File) {
    try {
      const json = JSON.parse(await file.text());
      const r = ParamsSchema.safeParse(json);
      if (!r.success) throw new Error(r.error.issues[0]?.message);
      setDraft(json);
      toast.success("Wczytano plik – sprawdź i zapisz");
    } catch (e) {
      toast.error(`Niepoprawny plik parametrów${e instanceof Error && e.message ? `: ${e.message}` : ""}`);
    }
  }

  const before = impact(saved);
  const after = validation?.success ? impact(validation.data) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Panel administracyjny</h1>
          <Badge variant="secondary">wersja {saved.version}</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            router.replace("/admin/login");
          }}
        >
          <LogOut className="size-4" aria-hidden /> Wyloguj
        </Button>
      </div>

      {session && !session.persistent && (
        <WarningCallout
          warning={{ severity: "warning", title: "Zmiany tylko w pamięci serwera", text: "Na tym serwerze nie skonfigurowano trwałego magazynu (Upstash). Zmiany obowiązują do restartu instancji. Ustaw UPSTASH_REDIS_REST_URL i UPSTASH_REDIS_REST_TOKEN, aby były trwałe." }}
        />
      )}
      {session?.defaultPassword && (
        <WarningCallout warning={{ severity: "info", title: "Hasło demonstracyjne", text: "Używane jest domyślne hasło demo. W produkcji ustaw zmienną ADMIN_PASSWORD." }} />
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent className="pt-0">
            <Tabs defaultValue="stawki">
              <div className="overflow-x-auto">
                <TabsList>
                  {TABS.map((t) => (
                    <TabsTrigger key={t.id} value={t.id}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {TABS.map((t) => (
                <TabsContent key={t.id} value={t.id} className="space-y-4 pt-4">
                  {t.keys.map((k) => (
                    <FieldEditor key={k} path={[k]} value={getAt(draft, [k])} onChange={onChange} />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Podgląd wpływu (7000 zł brutto)</CardTitle>
              <CardDescription>Przykładowe wyliczenie przed i po zmianie.</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="font-normal" />
                    <th className="font-normal">Teraz</th>
                    <th className="font-normal">Po zmianie</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["Podstawa", "base"],
                      ["Macierzyński", "maternity"],
                      ["Rodzicielski", "parental"],
                      ["Cały urlop", "long"],
                    ] as const
                  ).map(([label, k]) => (
                    <tr key={k} className={after && after[k] !== before[k] ? "font-semibold" : ""}>
                      <td className="py-1">{label}</td>
                      <td>
                        <Money value={before[k]} />
                      </td>
                      <td>{after ? <Money value={after[k]} /> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zapis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {validation && !validation.success && (
                <ul className="text-destructive list-disc pl-5 text-xs">
                  {validation.error.issues.slice(0, 5).map((i) => (
                    <li key={i.path.join(".") + i.message}>
                      {i.path.join(".")}: {i.message}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-muted-foreground text-xs">{changes.length ? `Zmienione pola: ${changes.length}` : "Brak zmian."}</p>
              {changes.length > 0 && (
                <ul className="max-h-32 overflow-y-auto font-mono text-[11px]">
                  {changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              <div className="space-y-1">
                <Label htmlFor="note">Opis zmiany</Label>
                <Input id="note" placeholder="np. nowa płaca minimalna od 1.01" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button className="w-full" onClick={save} disabled={busy || !changes.length || !validation?.success}>
                <Save className="size-4" aria-hidden /> Zapisz parametry
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={exportJson}>
                  <Download className="size-4" aria-hidden /> Eksport
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" aria-hidden /> Import
                </Button>
                <Button variant="outline" size="sm" onClick={reset}>
                  <RotateCcw className="size-4" aria-hidden /> Domyślne
                </Button>
              </div>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" aria-hidden /> Historia zmian
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-muted-foreground text-sm">Brak zmian – obowiązują parametry domyślne.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((h, i) => {
                    const prev = history[i + 1]?.params;
                    const d = prev ? diff(prev as unknown as Json, h.params as unknown as Json) : [];
                    return (
                      <li key={h.at + i} className="space-y-0.5 border-l-2 pl-3 text-sm">
                        <p>
                          <span className="font-medium">{h.action === "reset" ? "Przywrócono domyślne" : `Wersja ${h.version}`}</span>
                          <span className="text-muted-foreground"> · {new Date(h.at).toLocaleString("pl-PL")} · {h.author}</span>
                        </p>
                        {h.note && <p className="italic">„{h.note}”</p>}
                        {d.length > 0 && (
                          <ul className="text-muted-foreground font-mono text-[11px]">
                            {d.slice(0, 6).map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                            {d.length > 6 && <li>… i {d.length - 6} więcej</li>}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
