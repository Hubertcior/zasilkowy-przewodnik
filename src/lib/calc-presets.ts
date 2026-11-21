import type { Scenario } from "@/engine/types";

export type CalcScenario = Extract<Scenario, { kind: "urodzenie" | "adopcja" | "piecza" }>;

/** Presets for deep links from "Trudne sytuacje": /kalkulator?sytuacja=wczesniak */
export const CALC_PRESETS = ["martwe-urodzenie", "zgon-dziecka", "wczesniak", "za-zyciem", "szpital-matki", "smierc-matki"] as const;
export type CalcPreset = (typeof CALC_PRESETS)[number];

export function presetScenario(p: CalcPreset, sc: CalcScenario, today: string): CalcScenario {
  const birth: Extract<CalcScenario, { kind: "urodzenie" }> =
    sc.kind === "urodzenie" ? { ...sc, stillbirth: undefined, childDeath: undefined, prematurity: undefined } : { kind: "urodzenie", birthDate: today, children: 1, zaZyciem: false };
  switch (p) {
    case "martwe-urodzenie":
      return { ...birth, stillbirth: true };
    case "zgon-dziecka":
      return { ...birth, childDeath: { date: birth.birthDate } };
    case "wczesniak":
      return { ...birth, prematurity: { gestationWeek: 30, birthWeightG: 1400, hospitalWeeks: 5 } };
    case "za-zyciem":
      return { ...birth, zaZyciem: true };
    default:
      return birth;
  }
}

