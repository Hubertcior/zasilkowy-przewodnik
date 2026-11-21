import { calculateAll, type CalculateResult } from "./calculate";
import type { Params } from "./params";
import type { CaseFile, PeriodType } from "./types";

// Compare our engine with the expected ZUS decision stored in a case file (KAN-22).

export interface CaseComparison {
  id: string;
  title: string;
  synthetic: boolean;
  expected?: CaseFile["expected"];
  computed: { granted: boolean; base?: number; monthly?: number };
  /** True when every expected value matches (within 1 grosz). Cases without `expected` are ok. */
  ok: boolean;
  diffs: string[];
  result: CalculateResult;
}

const PRIMARY_TYPES: PeriodType[] = ["macierzynski", "na_warunkach_macierzynskiego", "zasilek_wys_macierzynskiego", "chorobowy_ciaza"];
const TOLERANCE = 0.01;

export function compareCase(c: CaseFile, params: Params, today?: string): CaseComparison {
  const result = calculateAll({ parents: c.parents, scenario: c.scenario, plan: c.plan, today }, params);
  const primary = c.parents.find((p) => p.role === "matka") ?? c.parents[0];
  const role = primary.role;
  const granted = result.eligibility[role]?.maternityEligible ?? false;
  const base = result.bases[role]?.base;
  const periods = result.schedule.periods.filter((p) => p.parent === role);
  const first = periods.find((p) => PRIMARY_TYPES.includes(p.type)) ?? periods[0];
  const computed = { granted, base: granted ? base : undefined, monthly: granted ? first?.monthlyAmount : undefined };

  const diffs: string[] = [];
  const e = c.expected;
  if (e) {
    if (e.granted !== granted) diffs.push(`decyzja: oczekiwano ${e.granted ? "przyznanie" : "odmowa"}, obliczono ${granted ? "przyznanie" : "odmowa"}`);
    if (e.base !== undefined && (computed.base === undefined || Math.abs(e.base - computed.base) > TOLERANCE)) {
      diffs.push(`podstawa: oczekiwano ${e.base}, obliczono ${computed.base ?? "—"}`);
    }
    if (e.monthly !== undefined && (computed.monthly === undefined || Math.abs(e.monthly - computed.monthly) > TOLERANCE)) {
      diffs.push(`kwota miesięczna: oczekiwano ${e.monthly}, obliczono ${computed.monthly ?? "—"}`);
    }
  }
  return { id: c.id, title: c.title, synthetic: c.synthetic, expected: e, computed, ok: diffs.length === 0, diffs, result };
}
