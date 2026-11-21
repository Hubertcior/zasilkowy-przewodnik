"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CaseFile } from "@/engine/types";

interface Comparison {
  ok: boolean;
  diffs: string[];
  expected?: CaseFile["expected"];
  computed: { granted: boolean; base?: number; monthly?: number };
}

const pln = (n?: number) => (n === undefined ? "—" : `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`);
const yesNo = (g?: boolean) => (g === undefined ? "—" : g ? "przyznany" : "odmowa");

/** "ZUS result vs our calculation" block for a loaded example case with `expected`. */
export function CaseComparison({ caseFile }: { caseFile: CaseFile }) {
  const [cmp, setCmp] = useState<Comparison | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cases/compare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(caseFile) })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setCmp(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [caseFile]);

  if (!caseFile.expected) return null;
  const e = caseFile.expected;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Wynik ZUS w sprawie a nasze wyliczenie</CardTitle>
          {cmp && (cmp.ok ? <Badge className="bg-emerald-600 text-white">Zgodne</Badge> : <Badge variant="destructive">Różnica</Badge>)}
        </div>
        {e.notes && <CardDescription>{e.notes}</CardDescription>}
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-destructive text-sm">Nie udało się porównać wyników.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>ZUS</TableHead>
                  <TableHead>Przewodnik</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Zasiłek macierzyński</TableCell>
                  <TableCell>{yesNo(e.granted)}</TableCell>
                  <TableCell>{cmp ? yesNo(cmp.computed.granted) : "…"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Podstawa wymiaru</TableCell>
                  <TableCell>{pln(e.base)}</TableCell>
                  <TableCell>{cmp ? pln(cmp.computed.base) : "…"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Kwota miesięczna</TableCell>
                  <TableCell>{pln(e.monthly)}</TableCell>
                  <TableCell>{cmp ? pln(cmp.computed.monthly) : "…"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
        {cmp && cmp.diffs.length > 0 && (
          <ul className="text-destructive mt-3 list-disc pl-5 text-sm">
            {cmp.diffs.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
