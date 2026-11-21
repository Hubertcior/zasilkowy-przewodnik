import { addDays, addMonths, addWeeks, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Params } from "./params";
import type { Prematurity, Scenario } from "./types";

/** Legal sources (KP = Kodeks pracy). Article numbers kept in one place for verification. */
export const ENTITLEMENT_SOURCES = {
  maternity: "art. 180 § 1 KP",
  beforeBirth: "art. 180 § 2 KP",
  obligatory: "art. 180 § 3 KP (14 tygodni po porodzie wykorzystuje matka)",
  childDeath: "art. 180 § 4–6 KP",
  supplementary: "art. 180¹ KP",
  parental: "art. 182¹ᵃ KP",
  adoption: "art. 183 KP",
  paternity: "art. 182³ KP",
} as const;

export interface Entitlement {
  /** Maternity (or maternity-like) leave length in weeks. May be fractional when shortened by days (child death). */
  maternityWeeks: number;
  maternityKind: "macierzynski" | "na_warunkach_macierzynskiego";
  maxBeforeBirthWeeks: number;
  obligatoryMotherWeeks: number;
  parentalWeeks: number;
  nonTransferablePerParent: number;
  supplementaryWeeks: number;
  paternityWeeks: number;
  paternityDeadline?: string;
  parentalDeadline?: string;
  /** Explicit end date of maternity leave, when a special rule fixes it (child death). */
  maternityEndDate?: string;
  childDeathRule?: string;
  /** False when nothing is due (e.g. child above the age limit). */
  eligible: boolean;
  notes: string[];
  sources: string[];
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Weeks of maternity leave by number of children born / accepted at once (5 = 5 or more). */
export function maternityWeeksFor(children: number, p: Params): number {
  const key = String(Math.min(Math.max(children, 1), 5)) as keyof Params["maternityWeeksByChildren"];
  return p.maternityWeeksByChildren[key];
}

export function parentalWeeksFor(children: number, zaZyciem: boolean, p: Params): number {
  const multiple = children > 1;
  if (zaZyciem) return multiple ? p.parentalWeeks.zaZyciemMultiple : p.parentalWeeks.zaZyciemSingle;
  return multiple ? p.parentalWeeks.multiple : p.parentalWeeks.single;
}

/**
 * Supplementary maternity leave for premature / hospitalised newborns (art. 180¹ KP).
 * One week per (started) week of hospitalisation, capped by category.
 */
export function supplementaryWeeksFor(pm: Prematurity, p: Params): { weeks: number; note: string } {
  const s = p.supplementary;
  const hospWeeks = s.roundPartialWeekUp ? Math.ceil(pm.hospitalWeeks - 1e-9) : Math.floor(pm.hospitalWeeks);
  if (pm.gestationWeek < s.extreme.beforeGestationWeek || pm.birthWeightG <= s.extreme.maxBirthWeightG) {
    const weeks = Math.min(hospWeeks * s.extreme.weeksPerHospitalWeek, s.extreme.maxWeeks);
    return {
      weeks,
      note:
        `Urlop uzupełniający: dziecko urodzone przed ${s.extreme.beforeGestationWeek}. tygodniem ciąży lub z masą do ${s.extreme.maxBirthWeightG} g – ` +
        `1 tydzień za każdy tydzień pobytu w szpitalu (${pm.hospitalWeeks} tyg. → ${hospWeeks}), maks. ${s.extreme.maxWeeks}: ${weeks} tyg.`,
    };
  }
  if (pm.gestationWeek < s.preterm.beforeGestationWeek && pm.birthWeightG > s.preterm.minBirthWeightGExclusive) {
    const weeks = Math.min(hospWeeks * s.preterm.weeksPerHospitalWeek, s.preterm.maxWeeks);
    return {
      weeks,
      note:
        `Urlop uzupełniający: dziecko urodzone między ${s.preterm.fromGestationWeek}. a ${s.preterm.beforeGestationWeek}. tygodniem ciąży z masą powyżej ` +
        `${s.preterm.minBirthWeightGExclusive} g – 1 tydzień za tydzień pobytu w szpitalu (${pm.hospitalWeeks} tyg. → ${hospWeeks}), maks. ${s.preterm.maxWeeks}: ${weeks} tyg.`,
    };
  }
  // Born at term: hospitalisation of at least N consecutive days, starting between day X and Y after birth.
  const days = Math.round(pm.hospitalWeeks * 7);
  const start = pm.hospitalStartDay;
  const inWindow = start !== undefined && start >= s.term.hospitalWindowFromDay && start <= s.term.hospitalWindowToDay;
  if (days >= s.term.minConsecutiveHospitalDays && inWindow) {
    const weeks = Math.min(hospWeeks * s.term.weeksPerHospitalWeek, s.term.maxWeeks);
    return {
      weeks,
      note:
        `Urlop uzupełniający: dziecko urodzone o czasie, hospitalizacja co najmniej ${s.term.minConsecutiveHospitalDays} dni z rzędu ` +
        `między ${s.term.hospitalWindowFromDay}. a ${s.term.hospitalWindowToDay}. dniem po porodzie (od ${start}. doby, ${days} dni → ${hospWeeks} tyg.), ` +
        `maks. ${s.term.maxWeeks}: ${weeks} tyg.`,
    };
  }
  return {
    weeks: 0,
    note:
      `Urlop uzupełniający nie przysługuje: dziecko urodzone o czasie, a hospitalizacja nie trwała co najmniej ${s.term.minConsecutiveHospitalDays} dni ` +
      `z rzędu między ${s.term.hospitalWindowFromDay}. a ${s.term.hospitalWindowToDay}. dniem po porodzie.`,
  };
}

function endOfYear(year: number): string {
  return `${year}-12-31`;
}

export function calcEntitlement(scenario: Scenario, params: Params): Entitlement {
  const notes: string[] = [];
  const sources = new Set<string>();
  const p = params;

  if ("acceptDate" in scenario) return adoptionEntitlement(scenario, p);
  return birthEntitlement(scenario, p, notes, sources);
}

function birthEntitlement(
  scenario: Extract<Scenario, { kind: "urodzenie" | "ciaza" }>,
  p: Params,
  notes: string[],
  sources: Set<string>,
): Entitlement {

  // Birth (or pregnancy – planning with the due date, 1 child assumed).
  const birthDate = scenario.kind === "urodzenie" ? scenario.birthDate : scenario.dueDate;
  const children = scenario.kind === "urodzenie" ? scenario.children : 1;
  const zaZyciem = scenario.kind === "urodzenie" ? scenario.zaZyciem : false;
  if (scenario.kind === "ciaza") {
    notes.push("Wyliczenie dla przewidywanej daty porodu, przy założeniu jednego dziecka.");
  }

  let maternityWeeks = maternityWeeksFor(children, p);
  sources.add(ENTITLEMENT_SOURCES.maternity).add(ENTITLEMENT_SOURCES.beforeBirth).add(ENTITLEMENT_SOURCES.obligatory);
  notes.push(
    `Urlop macierzyński: ${maternityWeeks} tygodni (${children === 1 ? "1 dziecko" : `${children} dzieci przy jednym porodzie`}).`,
    `Do ${p.deadlines.maternityStartWeeksBeforeDue} tygodni może przypaść przed przewidywaną datą porodu (potrzebne zaświadczenie lekarskie). ` +
      `Pierwsze ${p.motherObligatoryWeeks} tygodni po porodzie matka wykorzystuje osobiście.`,
  );

  let parentalWeeks = parentalWeeksFor(children, zaZyciem, p);
  sources.add(ENTITLEMENT_SOURCES.parental);
  notes.push(
    `Urlop rodzicielski: ${parentalWeeks} tygodni${zaZyciem ? " (zaświadczenie „Za życiem”)" : ""}. Każdemu z rodziców przysługuje ` +
      `${p.nonTransferableWeeks} tygodni, których nie można przenieść na drugiego rodzica. Można go podzielić na maks. ${p.parentalMaxParts} części ` +
      `i wykorzystać do końca roku, w którym dziecko kończy ${p.parentalUntilYearChildTurns} lat.`,
  );
  const parentalDeadline = endOfYear(parseISO(birthDate).getFullYear() + p.parentalUntilYearChildTurns);

  let supplementaryWeeks = 0;
  if (scenario.kind === "urodzenie" && scenario.prematurity) {
    const s = supplementaryWeeksFor(scenario.prematurity, p);
    supplementaryWeeks = s.weeks;
    sources.add(ENTITLEMENT_SOURCES.supplementary);
    notes.push(s.note);
    if (s.weeks > 0) notes.push("Urlop uzupełniający wykorzystuje jeden z rodziców, jednorazowo, bezpośrednio po urlopie macierzyńskim.");
    if (children > 1) notes.push("Przy wieloraczkach liczy się najniższa masa urodzeniowa i najdłuższa hospitalizacja.");
  }

  const paternityWeeks = p.paternity.weeks;
  const paternityDeadline = iso(addMonths(parseISO(birthDate), p.paternity.untilChildMonths));
  sources.add(ENTITLEMENT_SOURCES.paternity);
  notes.push(
    `Urlop ojcowski: ${paternityWeeks} tygodnie (w ${p.paternity.maxParts} częściach po min. ${p.paternity.minPartWeeks} tydzień) do ${paternityDeadline}. ` +
      "Liczba dzieci nie wydłuża urlopu ojcowskiego.",
  );

  // Child death or stillbirth.
  let maternityEndDate: string | undefined;
  let childDeathRule: string | undefined;
  if (scenario.kind === "urodzenie" && (scenario.childDeath || scenario.stillbirth)) {
    sources.add(ENTITLEMENT_SOURCES.childDeath);
    const deathDate = scenario.childDeath?.date ?? birthDate;
    const birth = parseISO(birthDate);
    const ageDays = differenceInCalendarDays(parseISO(deathDate), birth);
    const surviving = children - 1;

    if (surviving >= 1) {
      maternityWeeks = maternityWeeksFor(surviving, p);
      parentalWeeks = parentalWeeksFor(surviving, zaZyciem, p);
      childDeathRule = `Zgon jednego z dzieci: wymiar urlopu ustala się według liczby dzieci pozostałych przy życiu (${surviving}).`;
      notes.push(`${childDeathRule} Urlop macierzyński: ${maternityWeeks} tyg., rodzicielski: ${parentalWeeks} tyg.`);
    } else {
      const eightWeeksEnd = addWeeks(birth, p.childDeath.maternityWeeksIfBefore8Weeks);
      const fullEnd = addWeeks(birth, maternityWeeks);
      let end: Date;
      if (ageDays < p.childDeath.maternityWeeksIfBefore8Weeks * 7) {
        const minEnd = addDays(parseISO(deathDate), p.childDeath.minDaysAfterDeath);
        end = minEnd > eightWeeksEnd ? minEnd : eightWeeksEnd;
        childDeathRule =
          `${scenario.stillbirth ? "Martwe urodzenie" : "Zgon dziecka przed ukończeniem 8 tygodni życia"}: urlop macierzyński trwa ` +
          `${p.childDeath.maternityWeeksIfBefore8Weeks} tygodni po porodzie, nie krócej niż ${p.childDeath.minDaysAfterDeath} dni od dnia zgonu.`;
      } else {
        end = addDays(parseISO(deathDate), p.childDeath.daysAfterDeathIfAfter8Weeks);
        childDeathRule =
          `Zgon dziecka po ukończeniu 8 tygodni życia: urlop macierzyński kończy się po ${p.childDeath.daysAfterDeathIfAfter8Weeks} dniach od dnia zgonu.`;
      }
      if (end > fullEnd) end = fullEnd;
      maternityEndDate = iso(end);
      maternityWeeks = round2(differenceInCalendarDays(end, birth) / 7);
      parentalWeeks = 0;
      supplementaryWeeks = 0;
      notes.push(`${childDeathRule} Koniec urlopu: ${maternityEndDate}. Urlop rodzicielski nie przysługuje.`);
    }
  }

  return {
    maternityWeeks,
    maternityKind: "macierzynski",
    maxBeforeBirthWeeks: p.deadlines.maternityStartWeeksBeforeDue,
    obligatoryMotherWeeks: Math.min(p.motherObligatoryWeeks, maternityWeeks),
    parentalWeeks,
    nonTransferablePerParent: parentalWeeks > 0 ? p.nonTransferableWeeks : 0,
    supplementaryWeeks,
    paternityWeeks,
    paternityDeadline,
    parentalDeadline,
    maternityEndDate,
    childDeathRule,
    eligible: true,
    notes,
    sources: [...sources],
  };
}

function adoptionEntitlement(scenario: Extract<Scenario, { kind: "adopcja" | "piecza" }>, p: Params): Entitlement {
  const notes: string[] = [];
  const sources = new Set<string>([ENTITLEMENT_SOURCES.adoption]);
  const limit =
    scenario.kind === "adopcja"
      ? p.adoptionAgeLimits.adopcjaYears
      : scenario.postponedSchool
        ? p.adoptionAgeLimits.pieczaPostponedSchoolYears
        : p.adoptionAgeLimits.pieczaYears;
  const who = scenario.kind === "adopcja" ? "przysposobienie (adopcja)" : "rodzina zastępcza niezawodowa";
  const ages = scenario.childAges.length ? scenario.childAges : Array(scenario.children).fill(0);
  const eligibleAges = ages.filter((a) => a < limit);

  const empty: Entitlement = {
    maternityWeeks: 0,
    maternityKind: "na_warunkach_macierzynskiego",
    maxBeforeBirthWeeks: 0,
    obligatoryMotherWeeks: 0,
    parentalWeeks: 0,
    nonTransferablePerParent: 0,
    supplementaryWeeks: 0,
    paternityWeeks: 0,
    eligible: false,
    notes,
    sources: [...sources],
  };

  if (eligibleAges.length === 0) {
    notes.push(
      `Urlop na warunkach urlopu macierzyńskiego nie przysługuje: ${who} – dziecko musi mieć mniej niż ${limit} lat ` +
        `(wiek: ${ages.join(", ")}).` +
        (scenario.kind === "piecza" && !scenario.postponedSchool
          ? ` Przy odroczonym obowiązku szkolnym limit wynosi ${p.adoptionAgeLimits.pieczaPostponedSchoolYears} lat.`
          : ""),
    );
    return empty;
  }

  const count = eligibleAges.length;
  const fullWeeks = maternityWeeksFor(count, p);
  const maternityWeeks = Math.max(fullWeeks, p.adoptionMinWeeks);
  notes.push(
    `Urlop na warunkach urlopu macierzyńskiego (${who}): ${maternityWeeks} tygodni dla ${count === 1 ? "1 dziecka" : `${count} dzieci`} przyjętych jednocześnie.`,
    `Urlop przysługuje najdłużej do ukończenia przez dziecko ${limit} lat, ale zawsze nie krócej niż ${p.adoptionMinWeeks} tygodni.`,
  );
  if (eligibleAges.some((a) => a >= limit - 1)) {
    notes.push(
      `Dziecko kończy ${limit} lat w ciągu najbliższego roku – urlop może zostać skrócony do dnia ukończenia ${limit} lat ` +
        `(nie mniej niż ${p.adoptionMinWeeks} tygodni). Podaj dokładną datę urodzenia dziecka, by wyliczyć termin.`,
    );
  }
  if (count < ages.length) notes.push(`Dzieci w wieku ${limit} lat i starsze nie są uwzględniane w wymiarze.`);

  const parentalWeeks = parentalWeeksFor(count, false, p);
  sources.add(ENTITLEMENT_SOURCES.parental);
  const accept = parseISO(scenario.acceptDate);
  const youngest = Math.min(...eligibleAges);
  // Approximation without the child's birth date: end of year in which the youngest child reaches the limit.
  const parentalDeadline = endOfYear(accept.getFullYear() + (limit - youngest));
  notes.push(
    `Urlop rodzicielski: ${parentalWeeks} tygodni (${p.nonTransferableWeeks} tygodni nieprzenoszalnych dla każdego z rodziców), ` +
      `najpóźniej do ukończenia przez dziecko ${limit} lat (szacunkowo do ${parentalDeadline}).`,
  );

  let paternityWeeks = 0;
  let paternityDeadline: string | undefined;
  if (scenario.kind === "adopcja" && youngest < p.paternity.adoptionMaxChildAge) {
    paternityWeeks = p.paternity.weeks;
    paternityDeadline = iso(addMonths(accept, p.paternity.adoptionMonthsFromRuling));
    sources.add(ENTITLEMENT_SOURCES.paternity);
    notes.push(
      `Urlop ojcowski: ${paternityWeeks} tygodnie w ciągu ${p.paternity.adoptionMonthsFromRuling} miesięcy od uprawomocnienia postanowienia ` +
        `o przysposobieniu (przyjęto datę przyjęcia dziecka: do ${paternityDeadline}), nie dłużej niż do ukończenia przez dziecko ${p.paternity.adoptionMaxChildAge} lat.`,
    );
  } else if (scenario.kind === "piecza") {
    notes.push("Urlop ojcowski przysługuje przy przysposobieniu – nie w rodzinie zastępczej.");
  }

  return {
    ...empty,
    maternityWeeks,
    parentalWeeks,
    nonTransferablePerParent: p.nonTransferableWeeks,
    paternityWeeks,
    paternityDeadline,
    parentalDeadline,
    eligible: true,
    sources: [...sources],
  };
}
