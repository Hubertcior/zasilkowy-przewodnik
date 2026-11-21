"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmt = (n: number) => `${Math.round(n).toLocaleString("pl-PL")} zł`;

/** Stacked monthly cash flow (mother + father). */
export function MoneyChart({ data }: { data: { month: string; matka: number; ojciec: number }[] }) {
  const hasFather = data.some((d) => d.ojciec > 0);
  return (
    <div className="h-72 w-full" role="img" aria-label="Wykres wypłat zasiłku miesiąc po miesiącu">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(m: string) => m.slice(2).replace("-", "/")} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => `${Math.round(v / 1000)} tys.`} width={48} />
          <Tooltip
            formatter={(v, name) => [fmt(Number(v)), name === "matka" ? "Mama" : "Tata"]}
            labelFormatter={(m) => `Miesiąc ${m}`}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          />
          {hasFather && <Legend formatter={(v) => (v === "matka" ? "Mama" : "Tata")} wrapperStyle={{ fontSize: 12 }} />}
          <Bar isAnimationActive={false} dataKey="matka" stackId="a" fill="var(--chart-1)" radius={hasFather ? 0 : [4, 4, 0, 0]} />
          {hasFather && <Bar isAnimationActive={false} dataKey="ojciec" stackId="a" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
