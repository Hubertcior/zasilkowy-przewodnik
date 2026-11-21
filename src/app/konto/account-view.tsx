"use client";

import { FileText, HeartPulse, Landmark, LogIn, MessageSquare, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { SimulationBadge } from "@/components/simulation-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ParentData, Scenario } from "@/engine/types";
import type { Ezla } from "@/server/mocks/personas";
import { DebtTab } from "./debt-tab";
import { EzlaTab } from "./ezla-tab";
import { MessagesTab } from "./messages-tab";
import { MyDataTab } from "./my-data-tab";

export interface Profile {
  persona: { id: string; name: string; pesel: string };
  parents: ParentData[];
  scenario: Scenario;
}

type State = { status: "loading" } | { status: "anon" } | { status: "error"; message: string } | { status: "ok"; profile: Profile; ezla: Ezla[] };

/** SYMULACJA konta PUE/eZUS – requires the simulated mObywatel session (httpOnly cookie). */
export function AccountView() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/mock/zus/profile");
      if (res.status === 401) return setState({ status: "anon" });
      if (!res.ok) throw new Error(`Błąd ${res.status}`);
      const profile = (await res.json()) as Profile;
      const ez = await fetch("/api/mock/zus/ezla").then((r) => r.json() as Promise<{ ezla: Ezla[] }>);
      setState({ status: "ok", profile, ezla: ez.ezla });
    })().catch((e: Error) => setState({ status: "error", message: e.message }));
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-2 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Moje konto w ZUS</h1>
          <SimulationBadge />
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm">
          Symulacja połączenia z kontem PUE/eZUS: dane z konta, zwolnienia lekarskie, zaświadczenie o zadłużeniu i pytania do ZUS. Dane są fikcyjne, a
          ekran nie jest prawdziwym serwisem ZUS.
        </p>
      </header>

      {state.status === "loading" && <p className="text-muted-foreground">Łączę z kontem (symulacja)…</p>}
      {state.status === "error" && <p className="text-destructive">Nie udało się pobrać danych konta: {state.message}</p>}
      {state.status === "anon" && (
        <EmptyState
          icon={<LogIn />}
          title="Zaloguj się, aby zobaczyć konto"
          action={
            <Button asChild>
              <Link href="/logowanie">Zaloguj się (symulacja mObywatel)</Link>
            </Button>
          }
        >
          Podgląd konta działa dla osób demonstracyjnych zalogowanych przez symulację mObywatela. Dane wpisane ręcznie lub wczytane z przykładowej sprawy
          nie są połączone z kontem.
        </EmptyState>
      )}
      {state.status === "ok" && <AccountTabs profile={state.profile} ezla={state.ezla} />}
    </div>
  );
}

const TABS = ["dane", "ezla", "zadluzenie", "wiadomosci"] as const;

function AccountTabs({ profile, ezla }: { profile: Profile; ezla: Ezla[] }) {
  // Rendered only on the client (after the profile fetch), so reading the URL here is safe. Deep link: /konto?tab=ezla
  const [initial] = useState(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return TABS.find((x) => x === t) ?? "dane";
  });
  return (
    <Tabs defaultValue={initial} className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <UserRound className="size-4" aria-hidden />
          <span className="font-medium">{profile.persona.name}</span>
          <span className="text-muted-foreground">PESEL {profile.persona.pesel} (fikcyjny)</span>
        </p>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 print:hidden">
        <TabsList className="w-max">
          <TabsTrigger value="dane">
            <Landmark aria-hidden /> Moje dane
          </TabsTrigger>
          <TabsTrigger value="ezla">
            <HeartPulse aria-hidden /> <span className="sm:hidden">e-ZLA</span>
            <span className="hidden sm:inline">Zwolnienia e-ZLA</span>
          </TabsTrigger>
          <TabsTrigger value="zadluzenie">
            <FileText aria-hidden /> <span className="sm:hidden">Zadłużenie</span>
            <span className="hidden sm:inline">Zaświadczenie o zadłużeniu</span>
          </TabsTrigger>
          <TabsTrigger value="wiadomosci">
            <MessageSquare aria-hidden /> <span className="sm:hidden">Zapytaj</span>
            <span className="hidden sm:inline">Wiadomości do ZUS</span>
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="dane">
        <MyDataTab profile={profile} />
      </TabsContent>
      <TabsContent value="ezla">
        <EzlaTab profile={profile} ezla={ezla} />
      </TabsContent>
      <TabsContent value="zadluzenie">
        <DebtTab profile={profile} ezla={ezla} />
      </TabsContent>
      <TabsContent value="wiadomosci">
        <MessagesTab />
      </TabsContent>
    </Tabs>
  );
}
