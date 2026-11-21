import { calcBase, type BaseResult } from "./base";
import { checkEligibility, scenarioDate, type EligibilityResult } from "./eligibility";
import { calcEntitlement, type Entitlement } from "./entitlement";
import { buildFilingGuide, type FilingStep } from "./filing";
import { round2 } from "./money";
import type { Params } from "./params";
import { calcPregnancy, type PregnancyResult } from "./pregnancy";
import { buildSchedule, type ScheduleParent, type ScheduleResult } from "./schedule";
import type { CalculateRequest, PregnancyRequest } from "./schemas";
import type { LeavePlan, ParentData, Scenario, Warning } from "./types";
import { collectWarnings } from "./warnings";

type Role = "matka" | "ojciec";

export interface RateVariants {
  /** Monthly benefit with the long application (81.5%). */
  longApplication: number;
  /** Monthly maternity benefit without it (100%). */
  maternity100: number;
  /** Monthly parental benefit without it (70%). */
  parental70: number;
}

export interface CalculateResult {
  bases: Partial<Record<Role, BaseResult>>;
  /** Monthly amounts per role in both rate variants (for the summary screen). */
  rateVariants: Partial<Record<Role, RateVariants>>;
  eligibility: Partial<Record<Role, EligibilityResult>>;
  entitlement: Entitlement;
  plan: LeavePlan;
  schedule: ScheduleResult;
  warnings: Warning[];
  /** "Co i gdzie złożyć" steps (KAN-27). */
  filing: FilingStep[];
}

/** Default plan: long application, mother takes parental minus the father's 9 weeks, father his 9 weeks (if present). */
export function defaultPlan(entitlement: Entitlement, hasFather: boolean, params: Params): LeavePlan {
  const fatherWeeks = hasFather ? entitlement.nonTransferablePerParent : 0;
  const motherWeeks = entitlement.parentalWeeks - entitlement.nonTransferablePerParent;
  const parental: LeavePlan["parental"] = [];
  if (motherWeeks > 0) parental.push({ parent: "matka", weeks: motherWeeks });
  if (fatherWeeks > 0) parental.push({ parent: "ojciec", weeks: fatherWeeks });
  return {
    longApplication: true,
    parental,
    paternityWeeks: hasFather ? (Math.min(params.paternity.weeks, 2) as 0 | 1 | 2) : 0,
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function baseFor(parent: ParentData, scenario: Scenario, eligibility: EligibilityResult, params: Params, override?: number): BaseResult {
  if (override !== undefined) {
    return {
      base: override,
      method: "employee_12m",
      grossAverage: 0,
      monthsUsed: [],
      excludedMonths: [],
      steps: [`Podstawę wymiaru podano ręcznie: ${override.toFixed(2).replace(".", ",")} zł.`],
      sources: [],
    };
  }
  const title = eligibility.activePeriod?.title ?? parent.periods[0]?.title ?? "umowa_o_prace";
  return calcBase({ parent, title, rightDate: scenarioDate(scenario) }, params);
}

/** Full calculation for the integrated calculator (POST /api/calculate). */
export function calculateAll(req: CalculateRequest, params: Params): CalculateResult {
  const { parents, scenario } = req;
  const bases: CalculateResult["bases"] = {};
  const rateVariants: CalculateResult["rateVariants"] = {};
  const eligibility: CalculateResult["eligibility"] = {};
  const sched: Partial<Record<Role, ScheduleParent>> = {};

  for (const parent of parents) {
    const e = checkEligibility(parent, scenario, params);
    const b = baseFor(parent, scenario, e, params, req.baseOverride?.[parent.role]);
    eligibility[parent.role] = e;
    bases[parent.role] = b;
    rateVariants[parent.role] = {
      longApplication: round2(b.base * params.rates.longApplication),
      maternity100: round2(b.base * params.rates.maternity),
      parental70: round2(b.base * params.rates.parental),
    };
    sched[parent.role] = { data: parent, base: b.base, payer: e.payer, eligible: e.maternityEligible };
  }

  const entitlement = calcEntitlement(scenario, params);
  const plan = req.plan ?? defaultPlan(entitlement, !!sched.ojciec, params);
  const schedule = buildSchedule({ scenario, mother: sched.matka, father: sched.ojciec, plan }, entitlement, params);
  const warnings = collectWarnings(
    { parents, scenario, plan, eligibility: eligibility as Record<string, EligibilityResult>, today: req.today ?? today() },
    params,
  );
  const filing = buildFilingGuide({ parents, scenario, eligibility, entitlement, schedule, plan }, params);
  return { bases, rateVariants, eligibility, entitlement, plan, schedule, warnings, filing };
}

export interface PregnancyCalcResult extends PregnancyResult {
  base: BaseResult;
  warnings: Warning[];
}

/** Pregnancy benefits (POST /api/pregnancy). Computes the base when not given. */
export function calculatePregnancy(req: PregnancyRequest, params: Params): PregnancyCalcResult {
  const scenario: Scenario = { kind: "ciaza", dueDate: req.dueDate ?? req.illnessTo };
  const e = checkEligibility(req.parent, scenario, params, req.illnessFrom);
  const title = e.activePeriod?.title ?? req.parent.periods[0]?.title ?? "umowa_o_prace";
  const base =
    req.base !== undefined
      ? baseFor(req.parent, scenario, e, params, req.base)
      : calcBase({ parent: req.parent, title, rightDate: req.illnessFrom }, params);
  const result = calcPregnancy(
    { parent: req.parent, base: base.base, illnessFrom: req.illnessFrom, illnessTo: req.illnessTo, codeB: req.codeB, dueDate: req.dueDate },
    params,
  );
  const warnings = collectWarnings(
    { parents: [req.parent], scenario, eligibility: { [req.parent.role]: e }, today: req.today ?? today() },
    params,
  );
  return { ...result, base, warnings };
}
