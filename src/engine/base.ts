import { addDays, addMonths, format, parseISO } from "date-fns";
import { formatPLN, round2 } from "./money";
import { maxBaseNonEmployee, minBase, type Params } from "./params";
import type { InsurancePeriod, InsuranceTitle, MonthlyIncome, ParentData } from "./types";

/**
 * Legal sources for benefit-base rules (ustawa z 25.06.1999 o świadczeniach pieniężnych
 * z ubezpieczenia społecznego w razie choroby i macierzyństwa, "u.z.").
 * Article numbers are kept in one place so they are easy to verify and correct.
 */
export const BASE_SOURCES = {
  employee12m: "art. 36 ust. 1 u.z.",
  shorterInsurance: "art. 36 ust. 2 u.z.",
  firstMonth: "art. 37 ust. 1 u.z.",
  secondMonth: "art. 37 ust. 2 u.z.",
  incompleteMonths: "art. 38 u.z.",
  componentsExcluded: "art. 41 u.z.",
  periodicBonuses: "art. 42 u.z.",
  noNewBase: "art. 43 u.z.",
  minimum: "art. 45 u.z.",
  nonEmployee: "art. 48 u.z.",
  nonEmployeeCap: "art. 48a u.z. (ograniczenie do kwoty z art. 19 ust. 1 ustawy o s.u.s.)",
  contributionDeduction: "art. 3 pkt 4 u.z. (pomniejszenie o składki na ubezpieczenia społeczne finansowane przez ubezpieczonego)",
} as const;

export interface BaseInput {
  parent: ParentData;
  title: InsuranceTitle;
  /** Date the right to benefit arose (e.g. first day of incapacity or birth), YYYY-MM-DD. */
  rightDate: string;
  /** Base of a previous benefit; reused when the break is shorter than 1 month. */
  previousBase?: { amount: number; lastBenefitEnd: string };
}

export interface BaseMonth {
  month: string;
  amount: number;
  note?: string;
}

export type BaseMethod =
  | "previous_base"
  | "employee_12m"
  | "employee_shorter"
  | "employee_first_month"
  | "employee_second_month"
  | "employee_full_month_fallback"
  | "non_employee_12m"
  | "non_employee_shorter"
  | "non_employee_first_month"
  | "no_data";

export interface BaseResult {
  base: number;
  method: BaseMethod;
  /** Gross average (before contribution deduction), incl. periodic bonuses. */
  grossAverage: number;
  monthsUsed: BaseMonth[];
  excludedMonths: { month: string; reason: string }[];
  /** Human-readable explanation in Polish, for the UI. */
  steps: string[];
  /** Legal sources applied. */
  sources: string[];
  /** True when the minimum (employee) or cap (non-employee) changed the result. */
  adjusted?: "minimum" | "cap";
}

const MONTH = "yyyy-MM";
const monthOf = (isoDate: string) => isoDate.slice(0, 7);
const monthStart = (month: string) => parseISO(`${month}-01`);
const shiftMonth = (month: string, delta: number) => format(addMonths(monthStart(month), delta), MONTH);

export function isEmployeeTitle(title: InsuranceTitle): boolean {
  return title === "umowa_o_prace";
}

/**
 * Start date of the uninterrupted insurance chain (for the given title) that covers rightDate.
 * Periods are merged when the next one starts no later than the day after the previous ends.
 */
export function continuousInsuranceStart(periods: InsurancePeriod[], title: InsuranceTitle, rightDate: string): string | undefined {
  const relevant = periods
    .filter((p) => p.title === title && p.sickness !== "brak" && p.from <= rightDate)
    .sort((a, b) => a.from.localeCompare(b.from));
  let start: string | undefined;
  let end: string | undefined; // undefined = open-ended
  let open = false;
  for (const p of relevant) {
    const contiguous =
      start !== undefined && (open || (end !== undefined && p.from <= format(addDays(parseISO(end), 1), "yyyy-MM-dd")));
    if (!contiguous) {
      start = p.from;
      end = p.to;
      open = p.to === undefined;
    } else {
      if (p.to === undefined) open = true;
      else if (!open && (end === undefined || p.to > end)) end = p.to;
    }
  }
  // If the last chain ended before rightDate we still return its start;
  // benefits after insurance ends are handled by the eligibility module.
  return start;
}

/** First calendar month fully covered by insurance starting on `start`. */
function firstFullMonth(start: string): string {
  return start.endsWith("-01") ? monthOf(start) : shiftMonth(monthOf(start), 1);
}

function activePeriod(periods: InsurancePeriod[], title: InsuranceTitle, rightDate: string): InsurancePeriod | undefined {
  return periods
    .filter((p) => p.title === title && p.from <= rightDate && (p.to === undefined || p.to >= rightDate))
    .sort((a, b) => b.from.localeCompare(a.from))[0];
}

type MonthEval =
  | { kind: "used"; amount: number; note?: string }
  | { kind: "excluded"; reason: string };

/** Was the month worked at least half of the obligatory time? Explicit flag wins over day counts. */
function workedHalf(m: MonthlyIncome): boolean {
  if (m.workedHalfOrMore !== undefined) return m.workedHalfOrMore;
  if (m.daysWorked !== undefined && m.workingDays) return m.daysWorked * 2 >= m.workingDays;
  return true;
}

function isIncomplete(m: MonthlyIncome): boolean {
  return m.daysWorked !== undefined && !!m.workingDays && m.daysWorked < m.workingDays;
}

/**
 * Supplement pay for an incomplete month (art. 38 ust. 2 u.z.):
 * fixed components in full monthly amount, variable = amount / days worked × obligatory days.
 */
export function supplementMonth(m: MonthlyIncome): { amount: number; note: string } {
  const days = m.daysWorked && m.workingDays ? { w: m.daysWorked, o: m.workingDays } : undefined;
  if (m.fixed !== undefined || m.variable !== undefined) {
    const fixed = m.fixed ?? 0;
    const variable = m.variable ?? 0;
    const variableFull = days ? round2((variable / days.w) * days.o) : variable;
    return {
      amount: round2(fixed + variableFull),
      note: days
        ? `uzupełniono: stałe ${formatPLN(fixed)} + zmienne ${formatPLN(variable)} / ${days.w} dni × ${days.o} dni = ${formatPLN(variableFull)}`
        : `stałe ${formatPLN(fixed)} + zmienne ${formatPLN(variable)}`,
    };
  }
  const gross = m.gross - (m.excluded ?? 0);
  if (days) {
    const amount = round2((gross / days.w) * days.o);
    return { amount, note: `uzupełniono: ${formatPLN(gross)} / ${days.w} dni × ${days.o} dni` };
  }
  return { amount: round2(gross), note: "brak danych o dniach – przyjęto kwotę wypłaconą" };
}

function evalEmployeeMonth(m: MonthlyIncome | undefined): MonthEval {
  if (!m) return { kind: "excluded", reason: "brak danych o wynagrodzeniu" };
  if (!workedHalf(m)) return { kind: "excluded", reason: "przepracowano mniej niż połowę obowiązującego czasu pracy" };
  if (isIncomplete(m)) {
    const s = supplementMonth(m);
    return { kind: "used", amount: s.amount, note: s.note };
  }
  const amount = round2(m.gross - (m.excluded ?? 0));
  return {
    kind: "used",
    amount,
    note: m.excluded ? `pominięto składniki ${formatPLN(m.excluded)}` : undefined,
  };
}

function quarterOf(month: string): { y: number; q: number } {
  const [y, mm] = month.split("-").map(Number);
  return { y, q: Math.floor((mm - 1) / 3) + 1 };
}

/** Monthly share of periodic bonuses: 1/12 of 4 previous quarters, 1/12 of previous year's annual bonus. */
function periodicBonusShare(parent: ParentData, rightMonth: string): { amount: number; steps: string[] } {
  const bonuses = parent.bonuses ?? [];
  if (bonuses.length === 0) return { amount: 0, steps: [] };
  const { y, q } = quarterOf(rightMonth);
  const prevQuarters = new Set<string>();
  for (let i = 1; i <= 4; i++) {
    const idx = y * 4 + (q - 1) - i;
    prevQuarters.add(`${Math.floor(idx / 4)}-Q${(idx % 4) + 1}`);
  }
  const quarterly = bonuses.filter((b) => b.kind === "kwartalna" && prevQuarters.has(b.period));
  const annual = bonuses.filter((b) => b.kind === "roczna" && b.period === String(y - 1));
  const qSum = quarterly.reduce((s, b) => s + b.amount, 0);
  const aSum = annual.reduce((s, b) => s + b.amount, 0);
  const steps: string[] = [];
  if (quarterly.length) {
    steps.push(`Premie kwartalne z 4 kwartałów przed miesiącem powstania prawa: ${formatPLN(qSum)} → 1/12 = ${formatPLN(qSum / 12)} miesięcznie.`);
  }
  if (annual.length) {
    steps.push(`Premia roczna za ${y - 1} r.: ${formatPLN(aSum)} → 1/12 = ${formatPLN(aSum / 12)} miesięcznie.`);
  }
  return { amount: round2((qSum + aSum) / 12), steps };
}

function deduct(gross: number, p: Params): number {
  return round2(gross * (1 - p.contributionRate));
}

function pct(rate: number): string {
  return `${round2(rate * 100).toString().replace(".", ",")}%`;
}

/**
 * Benefit base (podstawa wymiaru zasiłku) for an employee or a non-employee.
 * Pure function: all legal numbers come from `params`.
 */
export function calcBase(input: BaseInput, params: Params): BaseResult {
  const { parent, title, rightDate, previousBase } = input;
  const steps: string[] = [];
  const sources: string[] = [];
  const rightMonth = monthOf(rightDate);

  // Break shorter than 1 month between benefits → base is not recalculated.
  if (previousBase) {
    const limit = format(addMonths(parseISO(previousBase.lastBenefitEnd), 1), "yyyy-MM-dd");
    if (rightDate <= limit) {
      steps.push(
        `Przerwa między poprzednim zasiłkiem (zakończonym ${previousBase.lastBenefitEnd}) a obecnym jest krótsza niż 1 miesiąc, ` +
          `więc podstawy nie ustala się na nowo: ${formatPLN(previousBase.amount)}.`,
      );
      return {
        base: round2(previousBase.amount),
        method: "previous_base",
        grossAverage: 0,
        monthsUsed: [],
        excludedMonths: [],
        steps,
        sources: [BASE_SOURCES.noNewBase],
      };
    }
  }

  return isEmployeeTitle(title)
    ? employeeBase(parent, title, rightDate, rightMonth, params, steps, sources)
    : nonEmployeeBase(parent, title, rightDate, rightMonth, params, steps, sources);
}

function employeeBase(
  parent: ParentData,
  title: InsuranceTitle,
  rightDate: string,
  rightMonth: string,
  params: Params,
  steps: string[],
  sources: string[],
): BaseResult {
  const incomes = new Map(parent.incomes.map((m) => [m.month, m]));
  const start = continuousInsuranceStart(parent.periods, title, rightDate);
  const windowStart = shiftMonth(rightMonth, -12);
  const fullFrom = start ? firstFullMonth(start) : windowStart;
  const from = fullFrom > windowStart ? fullFrom : windowStart;

  const months: string[] = [];
  for (let m = from; m < rightMonth; m = shiftMonth(m, 1)) months.push(m);

  const monthsUsed: BaseMonth[] = [];
  const excludedMonths: { month: string; reason: string }[] = [];
  let method: BaseMethod;
  let grossMonthly: number;

  if (months.length === 0) {
    // Right arose before a full calendar month of insurance.
    const startMonth = start ? monthOf(start) : rightMonth;
    const firstMonthIncome = incomes.get(startMonth);
    if (startMonth !== rightMonth && firstMonthIncome) {
      // Second month: pay for the (supplemented) first month.
      const ev = isIncomplete(firstMonthIncome)
        ? { ...supplementMonth(firstMonthIncome) }
        : { amount: round2(firstMonthIncome.gross - (firstMonthIncome.excluded ?? 0)), note: undefined };
      grossMonthly = ev.amount;
      monthsUsed.push({ month: startMonth, amount: ev.amount, note: ev.note });
      method = "employee_second_month";
      sources.push(BASE_SOURCES.secondMonth, BASE_SOURCES.incompleteMonths);
      steps.push(
        `Prawo powstało w drugim miesiącu ubezpieczenia (start ${start}). Podstawą jest wynagrodzenie za pierwszy miesiąc ` +
          `${ev.note ? `(${ev.note}) ` : ""}= ${formatPLN(ev.amount)} brutto.`,
      );
    } else if (parent.contractSalary !== undefined) {
      grossMonthly = parent.contractSalary;
      method = "employee_first_month";
      sources.push(BASE_SOURCES.firstMonth);
      steps.push(
        `Prawo powstało w pierwszym miesiącu ubezpieczenia${start ? ` (start ${start})` : ""}. Podstawą jest wynagrodzenie ` +
          `z umowy za pełny miesiąc: ${formatPLN(grossMonthly)} brutto.`,
      );
    } else {
      steps.push("Brak pełnych miesięcy ubezpieczenia i brak wynagrodzenia z umowy – nie można ustalić podstawy.");
      return { base: 0, method: "no_data", grossAverage: 0, monthsUsed, excludedMonths, steps, sources };
    }
  } else {
    for (const m of months) {
      const ev = evalEmployeeMonth(incomes.get(m));
      if (ev.kind === "used") monthsUsed.push({ month: m, amount: ev.amount, note: ev.note });
      else excludedMonths.push({ month: m, reason: ev.reason });
    }
    const shorter = from === fullFrom && fullFrom > windowStart;
    sources.push(shorter ? BASE_SOURCES.shorterInsurance : BASE_SOURCES.employee12m);
    steps.push(
      shorter
        ? `Ubezpieczenie trwa krócej niż 12 miesięcy (od ${start}), więc liczymy średnią z pełnych miesięcy ubezpieczenia: ${months[0]} – ${months.at(-1)}.`
        : `Okres: 12 pełnych miesięcy kalendarzowych przed miesiącem powstania prawa (${rightMonth}): ${months[0]} – ${months.at(-1)}.`,
    );
    if (monthsUsed.some((m) => m.note?.startsWith("uzupełniono"))) sources.push(BASE_SOURCES.incompleteMonths);
    if (excludedMonths.length) {
      sources.push(BASE_SOURCES.incompleteMonths);
      for (const e of excludedMonths) steps.push(`Pominięto ${e.month}: ${e.reason}.`);
    }
    if (monthsUsed.some((m) => m.note?.startsWith("pominięto"))) sources.push(BASE_SOURCES.componentsExcluded);
    for (const m of monthsUsed.filter((x) => x.note)) steps.push(`${m.month}: ${m.note} → ${formatPLN(m.amount)}.`);

    if (monthsUsed.length === 0) {
      if (parent.contractSalary === undefined) {
        steps.push("Żaden miesiąc nie spełnia warunków i brak wynagrodzenia z umowy – nie można ustalić podstawy.");
        return { base: 0, method: "no_data", grossAverage: 0, monthsUsed, excludedMonths, steps, sources };
      }
      grossMonthly = parent.contractSalary;
      method = "employee_full_month_fallback";
      sources.push(BASE_SOURCES.incompleteMonths);
      steps.push(
        `We wszystkich miesiącach przepracowano mniej niż połowę czasu pracy – przyjęto wynagrodzenie za pełny miesiąc z umowy: ${formatPLN(grossMonthly)}.`,
      );
    } else {
      const sum = round2(monthsUsed.reduce((s, m) => s + m.amount, 0));
      grossMonthly = round2(sum / monthsUsed.length);
      method = shorter ? "employee_shorter" : "employee_12m";
      steps.push(`Suma wynagrodzeń z ${monthsUsed.length} mies.: ${formatPLN(sum)} → średnio ${formatPLN(grossMonthly)} brutto miesięcznie.`);
    }
  }

  const bonus = periodicBonusShare(parent, rightMonth);
  if (bonus.amount > 0) {
    sources.push(BASE_SOURCES.periodicBonuses);
    steps.push(...bonus.steps);
    grossMonthly = round2(grossMonthly + bonus.amount);
    steps.push(`Razem z premiami: ${formatPLN(grossMonthly)} brutto miesięcznie.`);
  }

  let base = deduct(grossMonthly, params);
  sources.push(BASE_SOURCES.contributionDeduction);
  steps.push(`Pomniejszenie o składki społeczne ${pct(params.contributionRate)}: ${formatPLN(grossMonthly)} × ${pct(1 - params.contributionRate)} = ${formatPLN(base)}.`);

  // Minimum base applies to employees only, scaled by the employment fraction (part-time → proportionally lower).
  const fraction = activePeriod(parent.periods, title, rightDate)?.workTimeFraction ?? 1;
  const minimum = round2(minBase(params) * fraction);
  let adjusted: BaseResult["adjusted"];
  if (base < minimum) {
    sources.push(BASE_SOURCES.minimum);
    steps.push(
      `Podstawa jest niższa od minimum dla pracownika (minimalne wynagrodzenie ${formatPLN(params.minWage)} po odliczeniu składek` +
        `${fraction !== 1 ? `, × etat ${fraction}` : ""} = ${formatPLN(minimum)}), więc podwyższono ją do ${formatPLN(minimum)}.`,
    );
    base = minimum;
    adjusted = "minimum";
  }

  steps.push(`Podstawa wymiaru zasiłku: ${formatPLN(base)}.`);
  return { base, method, grossAverage: grossMonthly, monthsUsed, excludedMonths, steps, sources: [...new Set(sources)], adjusted };
}

function nonEmployeeBase(
  parent: ParentData,
  title: InsuranceTitle,
  rightDate: string,
  rightMonth: string,
  params: Params,
  steps: string[],
  sources: string[],
): BaseResult {
  // Declared contribution base wins (JDG); otherwise gross revenue reported (e.g. zlecenie).
  const declared = new Map<string, number>();
  for (const d of parent.declaredBase ?? []) declared.set(d.month, d.amount);
  for (const m of parent.incomes) if (!declared.has(m.month)) declared.set(m.month, m.gross - (m.excluded ?? 0));

  const start = continuousInsuranceStart(parent.periods, title, rightDate);
  const windowStart = shiftMonth(rightMonth, -12);
  const fullFrom = start ? firstFullMonth(start) : windowStart;
  const from = fullFrom > windowStart ? fullFrom : windowStart;

  const monthsUsed: BaseMonth[] = [];
  const excludedMonths: { month: string; reason: string }[] = [];
  for (let m = from; m < rightMonth; m = shiftMonth(m, 1)) {
    const amount = declared.get(m);
    if (amount === undefined) excludedMonths.push({ month: m, reason: "brak danych o przychodzie / podstawie składek" });
    else monthsUsed.push({ month: m, amount: round2(amount) });
  }

  sources.push(BASE_SOURCES.nonEmployee);
  let method: BaseMethod;
  let grossMonthly: number;
  if (monthsUsed.length === 0) {
    // Right in the first month(s) of insurance: declared base for the starting / current month.
    const fallbackMonth = [rightMonth, start ? monthOf(start) : rightMonth].find((m) => declared.has(m));
    if (!fallbackMonth) {
      steps.push("Brak zadeklarowanej podstawy składek – nie można ustalić podstawy.");
      return { base: 0, method: "no_data", grossAverage: 0, monthsUsed, excludedMonths, steps, sources };
    }
    grossMonthly = round2(declared.get(fallbackMonth)!);
    monthsUsed.push({ month: fallbackMonth, amount: grossMonthly });
    method = "non_employee_first_month";
    steps.push(
      `Prawo powstało przed upływem pełnego miesiąca ubezpieczenia – przyjęto podstawę wymiaru składek za ${fallbackMonth}: ${formatPLN(grossMonthly)}.`,
    );
  } else {
    const shorter = fullFrom > windowStart;
    method = shorter ? "non_employee_shorter" : "non_employee_12m";
    const sum = round2(monthsUsed.reduce((s, m) => s + m.amount, 0));
    grossMonthly = round2(sum / monthsUsed.length);
    steps.push(
      shorter
        ? `Ubezpieczenie trwa krócej niż 12 miesięcy (od ${start}) – średnia z pełnych miesięcy: ${monthsUsed[0].month} – ${monthsUsed.at(-1)!.month}.`
        : `Okres: 12 miesięcy przed miesiącem powstania prawa (${rightMonth}).`,
    );
    for (const e of excludedMonths) steps.push(`Pominięto ${e.month}: ${e.reason}.`);
    steps.push(`Przeciętna miesięczna podstawa wymiaru składek: ${formatPLN(sum)} / ${monthsUsed.length} = ${formatPLN(grossMonthly)}.`);
  }

  let base = deduct(grossMonthly, params);
  sources.push(BASE_SOURCES.contributionDeduction);
  steps.push(`Pomniejszenie o składki społeczne ${pct(params.contributionRate)}: ${formatPLN(grossMonthly)} × ${pct(1 - params.contributionRate)} = ${formatPLN(base)}.`);

  const cap = maxBaseNonEmployee(params);
  let adjusted: BaseResult["adjusted"];
  if (base > cap) {
    sources.push(BASE_SOURCES.nonEmployeeCap);
    steps.push(`Podstawa przekracza limit dla osób niebędących pracownikami (${formatPLN(cap)}) – przyjęto limit.`);
    base = cap;
    adjusted = "cap";
  }

  steps.push(`Podstawa wymiaru zasiłku: ${formatPLN(base)}.`);
  return { base, method, grossAverage: grossMonthly, monthsUsed, excludedMonths, steps, sources: [...new Set(sources)], adjusted };
}
