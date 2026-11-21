import type { PeriodType } from "@/engine/types";
import { cn } from "@/lib/utils";

export const PERIOD_LABELS: Record<PeriodType, string> = {
  macierzynski: "Macierzyński",
  na_warunkach_macierzynskiego: "Na warunkach macierzyńskiego",
  uzupelniajacy: "Uzupełniający",
  rodzicielski: "Rodzicielski",
  ojcowski: "Ojcowski",
  wynagrodzenie_chorobowe: "Wynagrodzenie chorobowe",
  chorobowy_ciaza: "Zasiłek chorobowy (ciąża)",
  zasilek_wys_macierzynskiego: "Zasiłek w wys. macierzyńskiego",
};

/** Colour per period type – shared by badges and the calculator timeline. */
export const PERIOD_COLORS: Record<PeriodType, string> = {
  macierzynski: "bg-chart-1 text-white",
  na_warunkach_macierzynskiego: "bg-chart-1 text-white",
  uzupelniajacy: "bg-chart-5 text-white",
  rodzicielski: "bg-chart-4 text-white",
  ojcowski: "bg-chart-3 text-white",
  wynagrodzenie_chorobowe: "bg-chart-2 text-black",
  chorobowy_ciaza: "bg-chart-2 text-black",
  zasilek_wys_macierzynskiego: "bg-chart-1 text-white",
};

export function PeriodBadge({ type, className }: { type: PeriodType; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", PERIOD_COLORS[type], className)}>
      {PERIOD_LABELS[type]}
    </span>
  );
}
