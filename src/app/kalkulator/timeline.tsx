"use client";

import { PERIOD_COLORS, PERIOD_LABELS } from "@/components/period-badge";
import type { BenefitPeriod } from "@/engine/types";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const pct = (r: number) => `${Math.round(r * 1000) / 10}%`.replace(".", ",");
const money = (n: number) => n.toLocaleString("pl-PL", { maximumFractionDigits: 0 }) + " zł";

/** Gantt-like timeline: one lane per parent, bars coloured by period type, month axis from the start date. */
export function Timeline({ periods, start }: { periods: BenefitPeriod[]; start: string }) {
  if (periods.length === 0) return <p className="text-muted-foreground text-sm">Brak okresów do pokazania.</p>;
  const t0 = Math.min(toMs(start), ...periods.map((p) => toMs(p.from)));
  const t1 = Math.max(...periods.map((p) => toMs(p.to) + DAY));
  const span = t1 - t0;
  const months = Math.ceil(span / (30.44 * DAY));
  const lanes: ("matka" | "ojciec")[] = ["matka", "ojciec"].filter((r) => periods.some((p) => p.parent === r)) as ("matka" | "ojciec")[];
  const pos = (ms: number) => `${((ms - t0) / span) * 100}%`;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px] space-y-2" role="img" aria-label="Oś czasu urlopów rodziców">
        <div className="relative ml-16 h-5 text-[10px]">
          {Array.from({ length: months + 1 }, (_, m) => {
            const ms = t0 + m * 30.44 * DAY;
            if (ms > t1) return null;
            return (
              <span key={m} className="text-muted-foreground absolute -translate-x-1/2" style={{ left: pos(ms) }}>
                {m % (months > 18 ? 3 : 1) === 0 ? `${m} m.` : ""}
              </span>
            );
          })}
        </div>
        {lanes.map((lane) => (
          <div key={lane} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-sm font-medium">{lane === "matka" ? "Mama" : "Tata"}</span>
            <div className="bg-muted relative h-14 flex-1 rounded-lg">
              {periods
                .filter((p) => p.parent === lane)
                .map((p) => {
                  const left = toMs(p.from);
                  const width = toMs(p.to) + DAY - left;
                  return (
                    <div
                      key={p.type + p.from + p.rate}
                      className={cn("absolute top-1 bottom-1 overflow-hidden rounded-md px-1.5 py-1 text-[10px] leading-tight shadow-sm", PERIOD_COLORS[p.type])}
                      style={{ left: pos(left), width: `${(width / span) * 100}%` }}
                      title={`${PERIOD_LABELS[p.type]}: ${p.from} – ${p.to}, ${pct(p.rate)}, ${money(p.monthlyAmount)}/mies.`}
                    >
                      <span className="block truncate font-semibold">{PERIOD_LABELS[p.type]}</span>
                      <span className="block truncate">
                        {pct(p.rate)}
                        {p.workFraction ? ` · praca ${p.workFraction} et.` : ""} · {money(p.monthlyAmount)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
