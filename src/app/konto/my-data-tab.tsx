"use client";

import { Money } from "@/components/money";
import { SimulationBadge } from "@/components/simulation-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ParentData } from "@/engine/types";
import type { Profile } from "./account-view";

export const TITLE_LABEL = { umowa_o_prace: "Umowa o pracę", zlecenie: "Umowa zlecenie", dzialalnosc: "Działalność gospodarcza", inne: "Inny tytuł" } as const;
const SICKNESS_LABEL = { obowiazkowe: "obowiązkowe", dobrowolne: "dobrowolne", brak: "brak" } as const;
const ROLE_LABEL = { matka: "Mama", ojciec: "Tata" } as const;

function contributionRows(p: ParentData): { month: string; amount: number }[] {
  if (p.declaredBase?.length) return p.declaredBase.map((x) => ({ month: x.month, amount: x.amount }));
  return p.incomes.map((x) => ({ month: x.month, amount: x.gross }));
}

/** "Moje dane": insurance periods, payers and contribution bases from the (simulated) ZUS account. */
export function MyDataTab({ profile }: { profile: Profile }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {profile.parents.map((p) => (
        <Card key={p.role}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {ROLE_LABEL[p.role]} – dane z konta ZUS <SimulationBadge />
            </CardTitle>
            <CardDescription>Okresy ubezpieczenia, płatnicy składek i podstawy wymiaru składek z ostatnich 12 miesięcy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Okresy ubezpieczenia</h3>
              {p.periods.map((per, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{TITLE_LABEL[per.title]}</span>
                    <Badge variant={per.sickness === "brak" ? "destructive" : "secondary"}>chorobowe: {SICKNESS_LABEL[per.sickness]}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    od {per.from} {per.to ? `do ${per.to}` : "– nadal"}
                  </p>
                  <p className="text-muted-foreground">
                    Płatnik: {per.payerName ?? (per.title === "dzialalnosc" ? "własna działalność (płatnik = ubezpieczona osoba)" : "—")}
                    {per.payerInsuredCount != null && ` · zgłasza ${per.payerInsuredCount} ${per.payerInsuredCount > 20 ? "osób (wypłaca płatnik)" : "osób (wypłaca ZUS)"}`}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Podstawy wymiaru składek</h3>
              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Miesiąc</TableHead>
                      <TableHead className="text-right">{p.declaredBase?.length ? "Zadeklarowana podstawa" : "Przychód brutto"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributionRows(p).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-muted-foreground">
                          Brak danych
                        </TableCell>
                      </TableRow>
                    )}
                    {contributionRows(p)
                      .slice()
                      .reverse()
                      .map((r) => (
                        <TableRow key={r.month}>
                          <TableCell>{r.month}</TableCell>
                          <TableCell className="text-right">
                            <Money value={r.amount} />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
