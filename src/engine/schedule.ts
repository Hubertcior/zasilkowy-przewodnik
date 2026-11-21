import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Entitlement } from "./entitlement";
import { pickActivePeriod, scenarioDate } from "./eligibility";
import { formatPLN, round2 } from "./money";
import type { Params } from "./params";
import type { BenefitPeriod, LeavePlan, ParentData, PeriodType, Scenario } from "./types";

/** Legal sources (u.z. = ustawa zasiłkowa, KP = Kodeks pracy). */
export const SCHEDULE_SOURCES = {
  rates: "art. 31 u.z. (wysokość zasiłku macierzyńskiego)",
  longApplication: "art. 31 ust. 3 u.z. (81,5% przy wniosku złożonym do 21 dni po porodzie)",
  daily: "art. 18 ust. 6 u.z. (zasiłek za 1 dzień = 1/30 kwoty miesięcznej)",
  takeOver: "art. 180 § 5–7 KP (przejęcie urlopu macierzyńskiego przez ojca)",
  parental: "art. 182¹ᵃ KP (urlop rodzicielski, 9 tygodni nieprzenoszalnych, do 5 części)",
  combineWork: "art. 182¹ᵉ KP (łączenie urlopu rodzicielskiego z pracą do 1/2 etatu)",
  paternity: "art. 182³ KP",
} as const;

type Who = "matka" | "ojciec";

export interface ScheduleParent {
  data: ParentData;
  base: number;
  payer: "platnik" | "ZUS";
  eligible: boolean;
}

export interface ScheduleInput {
  scenario: Scenario;
  mother?: ScheduleParent;
  father?: ScheduleParent;
  plan: LeavePlan;
}

export interface ScheduleResult {
  periods: BenefitPeriod[];
  monthly: { month: string; matka: number; ojciec: number }[];
  totals: { matka: number; ojciec: number; razem: number };
  comparison?: { longApplication: number; separate: number; difference: number };
  validation: { ok: boolean; errors: string[] };
  notes: string[];
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const pct = (r: number) => `${round2(r * 100).toString().replace(".", ",")}%`;

function amounts(base: number, rate: number, days: number, workFraction = 0) {
  const monthlyAmount = round2(base * rate * (1 - workFraction));
  const total = round2((days * monthlyAmount) / 30);
  return { monthlyAmount, total };
}

/** Split a period's days across calendar months, each month = days × monthly / 30. */
function splitByMonth(p: BenefitPeriod): Map<string, number> {
  const out = new Map<string, number>();
  let d = parseISO(p.from);
  const end = parseISO(p.to);
  while (d <= end) {
    const month = format(d, "yyyy-MM");
    const monthEnd = addDays(addMonths(parseISO(`${month}-01`), 1), -1);
    const segEnd = monthEnd < end ? monthEnd : end;
    const days = differenceInCalendarDays(segEnd, d) + 1;
    out.set(month, (out.get(month) ?? 0) + (days * p.monthlyAmount) / 30);
    d = addDays(segEnd, 1);
  }
  return out;
}

interface BuildCtx {
  input: ScheduleInput;
  ent: Entitlement;
  p: Params;
  long: boolean;
  errors: string[];
  notes: string[];
}

function isEmployee(data: ParentData, onDate: string): boolean {
  return pickActivePeriod(data.periods, onDate)?.title === "umowa_o_prace";
}

/** Core: build periods for a given rate variant. Validation/notes are collected only when ctx arrays are used. */
function buildPeriods(ctx: BuildCtx): BenefitPeriod[] {
  const { input, ent, p, long, errors, notes } = ctx;
  const { plan, mother, father } = input;
  const start = parseISO(scenarioDate(input.scenario));
  const periods: BenefitPeriod[] = [];
  const parents: Record<Who, ScheduleParent | undefined> = { matka: mother, ojciec: father };
  const adoption = ent.maternityKind === "na_warunkach_macierzynskiego";

  const push = (type: PeriodType, who: Who, from: Date, days: number, rate: number, workFraction = 0, note?: string) => {
    const par = parents[who];
    if (days <= 0) return;
    if (!par || !par.eligible) {
      notes.push(
        `${who === "matka" ? "Matce" : "Ojcu"} nie przysługuje zasiłek za okres „${type}” (brak ubezpieczenia chorobowego lub danych) – okres pominięty w kwotach.`,
      );
      return;
    }
    const { monthlyAmount, total } = amounts(par.base, rate, days, workFraction);
    periods.push({
      type,
      parent: who,
      from: iso(from),
      to: iso(addDays(from, days - 1)),
      days,
      rate,
      base: par.base,
      monthlyAmount,
      total,
      payer: par.payer,
      ...(workFraction ? { workFraction } : {}),
      ...(note ? { note } : {}),
    });
  };

  const maternityType: PeriodType = adoption ? "na_warunkach_macierzynskiego" : "macierzynski";
  const maternityRate = long ? p.rates.longApplication : adoption ? p.rates.maternityLikeAdoption : p.rates.maternity;
  const fullMaternityDays = Math.round(ent.maternityWeeks * 7);

  // --- Maternity (and father's take-over) -------------------------------------------------------
  let motherWeeks = plan.motherMaternityWeeks ?? ent.maternityWeeks;
  const takeOver = plan.fatherTakesOverFromWeek;
  if (takeOver !== undefined) {
    motherWeeks = takeOver;
    if (!adoption && takeOver < ent.obligatoryMotherWeeks) {
      if (plan.specialTakeOver) {
        notes.push(
          `Ojciec przejmuje urlop macierzyński przed upływem ${ent.obligatoryMotherWeeks} tygodni – dopuszczalne w sytuacji szczególnej ` +
            `(${plan.specialTakeOver.replaceAll("_", " ")}).`,
        );
      } else {
        errors.push(
          `Matka musi wykorzystać co najmniej ${ent.obligatoryMotherWeeks} tygodni urlopu macierzyńskiego, zanim ojciec go przejmie ` +
            "(wcześniej tylko w sytuacjach szczególnych: pobyt w szpitalu, niezdolność do samodzielnej egzystencji, śmierć matki, porzucenie dziecka).",
        );
      }
    }
  } else if (!adoption && motherWeeks < ent.obligatoryMotherWeeks) {
    errors.push(`Matka musi wykorzystać co najmniej ${ent.obligatoryMotherWeeks} tygodni urlopu macierzyńskiego.`);
  }
  if (motherWeeks > ent.maternityWeeks) {
    errors.push(`Urlop macierzyński matki (${motherWeeks} tyg.) przekracza wymiar ${ent.maternityWeeks} tyg.`);
    motherWeeks = ent.maternityWeeks;
  }
  const motherDays = Math.min(Math.round(motherWeeks * 7), fullMaternityDays);
  push(maternityType, "matka", start, motherDays, maternityRate);
  let cursor = addDays(start, motherDays);
  let lastMaternityParent: Who = "matka";

  if (takeOver !== undefined) {
    const fatherDays = fullMaternityDays - motherDays;
    if (fatherDays > 0) {
      push(maternityType, "ojciec", cursor, fatherDays, maternityRate, 0, "przejęcie urlopu macierzyńskiego");
      cursor = addDays(cursor, fatherDays);
      lastMaternityParent = "ojciec";
      notes.push(`Ojciec przejmuje pozostałe ${round2(fatherDays / 7)} tyg. urlopu macierzyńskiego bezpośrednio po matce.`);
    }
  } else if (motherDays < fullMaternityDays) {
    notes.push(`Niewykorzystane ${round2((fullMaternityDays - motherDays) / 7)} tyg. urlopu macierzyńskiego przepada.`);
  }

  // --- Supplementary (one parent, right after maternity, 100%) ---------------------------------
  if (ent.supplementaryWeeks > 0) {
    const days = ent.supplementaryWeeks * 7;
    push("uzupelniajacy", lastMaternityParent, cursor, days, p.rates.supplementary);
    cursor = addDays(cursor, days);
  }

  // --- Parental parts (sequential), long application: father's first 9 weeks always 70% --------
  const totalParental = plan.parental.reduce((s, x) => s + x.weeks, 0);
  if (plan.parental.length > p.parentalMaxParts) {
    errors.push(`Urlop rodzicielski można podzielić na maks. ${p.parentalMaxParts} części (podano ${plan.parental.length}).`);
  }
  if (totalParental > ent.parentalWeeks) {
    errors.push(`Suma urlopu rodzicielskiego (${totalParental} tyg.) przekracza wymiar ${ent.parentalWeeks} tyg.`);
  }
  for (const who of ["matka", "ojciec"] as Who[]) {
    const own = plan.parental.filter((x) => x.parent === who).reduce((s, x) => s + x.weeks, 0);
    if (own > ent.parentalWeeks - ent.nonTransferablePerParent) {
      errors.push(
        `${who === "matka" ? "Matka" : "Ojciec"} może wykorzystać maks. ${ent.parentalWeeks - ent.nonTransferablePerParent} tyg. urlopu rodzicielskiego – ` +
          `${ent.nonTransferablePerParent} tyg. przysługuje wyłącznie drugiemu rodzicowi.`,
      );
    }
  }

  let fatherParentalUsed = 0;
  for (const part of plan.parental) {
    const f = part.workFraction ?? 0;
    const par = parents[part.parent];
    if (f > p.combineWork.maxWorkFraction) {
      errors.push(`Łączenie urlopu rodzicielskiego z pracą: maks. ${p.combineWork.maxWorkFraction} etatu (podano ${f}).`);
    }
    if (f > 0 && par && !isEmployee(par.data, iso(cursor))) {
      errors.push("Łączenie urlopu rodzicielskiego z pracą dotyczy tylko pracownika (umowa o pracę).");
    }
    const calendarDays = Math.round((part.weeks * 7) / (1 - Math.min(f, 0.99)));
    const note = f > 0 ? `praca na ${f} etatu: ${part.weeks} tyg. urlopu wydłużone do ${round2(calendarDays / 7)} tyg.` : undefined;

    if (long && part.parent === "ojciec") {
      // Father's non-transferable weeks are paid at 70% even with the long application.
      const remaining70 = Math.max(ent.nonTransferablePerParent - fatherParentalUsed, 0);
      const weeks70 = Math.min(part.weeks, remaining70);
      const days70 = Math.round((weeks70 * 7) / (1 - Math.min(f, 0.99)));
      push("rodzicielski", "ojciec", cursor, days70, p.rates.parental, f, note);
      const restDays = calendarDays - days70;
      push("rodzicielski", "ojciec", addDays(cursor, days70), restDays, p.rates.longApplication, f, note);
    } else {
      push("rodzicielski", part.parent, cursor, calendarDays, long ? p.rates.longApplication : p.rates.parental, f, note);
    }
    if (part.parent === "ojciec") fatherParentalUsed += part.weeks;
    cursor = addDays(cursor, calendarDays);
  }

  if (ent.parentalDeadline && plan.parental.length && iso(addDays(cursor, -1)) > ent.parentalDeadline) {
    errors.push(`Urlop rodzicielski musi się zakończyć do ${ent.parentalDeadline}.`);
  }

  // --- Paternity (father, 100%) ------------------------------------------------------------------
  // After a stillbirth there is no child to raise, so no paternity leave (art. 182³ KP: father raising the child).
  const stillbirth = input.scenario.kind === "urodzenie" && !!input.scenario.stillbirth;
  if (stillbirth && (plan.paternityWeeks ?? 0) > 0) notes.push("Po martwym urodzeniu urlop ojcowski nie przysługuje – pominięto go w planie.");
  const paternityWeeks = stillbirth ? 0 : (plan.paternityWeeks ?? 0);
  if (paternityWeeks > 0) {
    if (paternityWeeks > ent.paternityWeeks) {
      errors.push(`Urlop ojcowski: maks. ${ent.paternityWeeks} tyg. (podano ${paternityWeeks}).`);
    }
    const from = addDays(start, (plan.paternityStartWeek ?? 0) * 7);
    const days = paternityWeeks * 7;
    if (ent.paternityDeadline && iso(addDays(from, days - 1)) > ent.paternityDeadline) {
      errors.push(`Urlop ojcowski trzeba wykorzystać do ${ent.paternityDeadline}.`);
    }
    push("ojcowski", "ojciec", from, days, p.rates.paternity);
  }

  return periods;
}

function totalsOf(periods: BenefitPeriod[]) {
  const matka = round2(periods.filter((x) => x.parent === "matka").reduce((s, x) => s + x.total, 0));
  const ojciec = round2(periods.filter((x) => x.parent === "ojciec").reduce((s, x) => s + x.total, 0));
  return { matka, ojciec, razem: round2(matka + ojciec) };
}

export function buildSchedule(input: ScheduleInput, entitlement: Entitlement, params: Params): ScheduleResult {
  const errors: string[] = [];
  const notes: string[] = [];
  // After stillbirth / the only child's death there is no parental leave, so the 81.5% variant does not apply:
  // the shortened maternity leave is paid at 100% (Poradnik ZUS dla rodziców 2026, s. 34; art. 180¹ KP).
  const loss = entitlement.parentalWeeks === 0 && !!entitlement.childDeathRule;
  const long = input.plan.longApplication && !loss;
  if (loss && input.plan.longApplication) notes.push("Po martwym urodzeniu lub śmierci dziecka nie ma urlopu rodzicielskiego – wariant 81,5% nie ma zastosowania, zasiłek wynosi 100%.");

  const periods = buildPeriods({ input, ent: entitlement, p: params, long, errors, notes }).sort(
    (a, b) => a.from.localeCompare(b.from) || a.parent.localeCompare(b.parent),
  );

  // Both rate variants for the same plan (validation/notes of the alternative discarded).
  const alt = buildPeriods({ input, ent: entitlement, p: params, long: !long, errors: [], notes: [] });
  const curTotal = totalsOf(periods).razem;
  const altTotal = totalsOf(alt).razem;
  const comparison = loss ? undefined : {
    longApplication: long ? curTotal : altTotal,
    separate: long ? altTotal : curTotal,
    difference: round2((long ? curTotal : altTotal) - (long ? altTotal : curTotal)),
  };

  // Monthly cash flow.
  const monthMap = new Map<string, { matka: number; ojciec: number }>();
  for (const per of periods) {
    for (const [month, amt] of splitByMonth(per)) {
      const row = monthMap.get(month) ?? { matka: 0, ojciec: 0 };
      row[per.parent] += amt;
      monthMap.set(month, row);
    }
  }
  const monthly = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, r]) => ({ month, matka: round2(r.matka), ojciec: round2(r.ojciec) }));

  // Explanatory notes.
  const p = params;
  if (long) {
    notes.unshift(
      `Wniosek o cały urlop złożony w ciągu ${p.deadlines.longApplicationDaysAfterBirth} dni po porodzie: ${pct(p.rates.longApplication)} podstawy ` +
        `za urlop macierzyński i rodzicielski, z wyjątkiem ${entitlement.nonTransferablePerParent} tyg. drugiego rodzica, za które zawsze przysługuje ${pct(p.rates.parental)}.`,
    );
    const fatherWeeks = input.plan.parental.filter((x) => x.parent === "ojciec").reduce((s, x) => s + x.weeks, 0);
    if (fatherWeeks < entitlement.nonTransferablePerParent && entitlement.parentalWeeks > 0) {
      notes.push(
        `Ojciec wykorzystuje ${fatherWeeks} z ${entitlement.nonTransferablePerParent} tyg. przysługujących tylko jemu – niewykorzystana część przepada.`,
      );
    }
  } else {
    notes.unshift(
      `Bez wniosku o cały urlop: ${pct(p.rates.maternity)} podstawy za urlop macierzyński i ${pct(p.rates.parental)} za urlop rodzicielski.`,
    );
  }
  if (periods.some((x) => x.workFraction)) {
    notes.push(
      "Przy łączeniu urlopu rodzicielskiego z pracą (do 1/2 etatu) urlop wydłuża się proporcjonalnie, a zasiłek przysługuje za cały wydłużony okres " +
        "w wysokości proporcjonalnej do wymiaru urlopu (podstawa × stawka × (1 − część etatu)). Maksymalnie urlop może się wydłużyć dwukrotnie.",
    );
  }
  if (comparison)
    notes.push(
      `Wariant z wnioskiem o cały urlop: ${formatPLN(comparison.longApplication)}; urlopy osobno (100% + 70%): ${formatPLN(comparison.separate)}; ` +
        `różnica ${formatPLN(comparison.difference)}.`,
    );
  notes.push(
    "Zasiłek za 1 dzień = 1/30 kwoty miesięcznej. Części urlopu rodzicielskiego ułożono kolejno po sobie.",
  );

  return {
    periods,
    monthly,
    totals: totalsOf(periods),
    comparison,
    validation: { ok: errors.length === 0, errors },
    notes,
  };
}
