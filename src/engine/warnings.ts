import { addDays, addMonths, addWeeks, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { EligibilityResult } from "./eligibility";
import { pickActivePeriod, scenarioDate } from "./eligibility";
import { formatPLN, round2 } from "./money";
import type { Params } from "./params";
import type { InsurancePeriod, LeavePlan, ParentData, Scenario, Warning } from "./types";

/** Legal sources for warnings. */
export const WARNING_SOURCES = {
  sham: "art. 83 ust. 1 ustawy o systemie ubezpieczeń społecznych w zw. z art. 58 i 83 Kodeksu cywilnego; zus.pl",
  baseIncrease: "art. 41 ustawy o systemie ubezpieczeń społecznych (kontrola podstawy wymiaru składek); zus.pl",
  insuredOnBirth: "art. 29 ust. 1 ustawy zasiłkowej",
  voluntary: "art. 11 ust. 2 ustawy o systemie ubezpieczeń społecznych (dobrowolne ubezpieczenie chorobowe)",
  waiting: "art. 4 ustawy zasiłkowej",
  debt: "art. 14 ust. 2 pkt 2 ustawy o systemie ubezpieczeń społecznych (ustanie dobrowolnego ubezpieczenia przy nieopłaceniu składki w terminie)",
  longApplication: "art. 31 ust. 3 ustawy zasiłkowej; art. 180¹ Kodeksu pracy",
  nonTransferable: "art. 182¹ᵃ § 1 Kodeksu pracy",
  paternity: "art. 182³ Kodeksu pracy",
  kpProtection: "art. 177 § 1 i § 3 Kodeksu pracy",
  combineWork: "art. 182¹ᵉ Kodeksu pracy",
  employmentChange: "art. 36–38 ustawy zasiłkowej (podstawa z 12 miesięcy)",
} as const;

export interface WarningContext {
  parents: ParentData[];
  scenario: Scenario;
  plan?: LeavePlan;
  /** Keyed by parent role ('matka' | 'ojciec'). */
  eligibility: Record<string, EligibilityResult>;
  /** Today's date, YYYY-MM-DD. */
  today: string;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const SEVERITY_ORDER: Record<Warning["severity"], number> = { critical: 0, warning: 1, info: 2 };

function avg(xs: number[]): number | undefined {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : undefined;
}

/** Monthly amounts used for a base (declared base for JDG, gross pay otherwise). */
function monthlySeries(parent: ParentData): { month: string; amount: number }[] {
  const declared = (parent.declaredBase ?? []).map((d) => ({ month: d.month, amount: d.amount }));
  return declared.length ? declared : parent.incomes.map((m) => ({ month: m.month, amount: m.gross }));
}

export function collectWarnings(ctx: WarningContext, params: Params): Warning[] {
  const { parents, scenario, plan, eligibility, today } = ctx;
  const w = params.warnings;
  const out: Warning[] = [];
  const add = (x: Warning) => out.push(x);

  const event = scenarioDate(scenario);
  const isBirth = scenario.kind === "ciaza" || scenario.kind === "urodzenie";
  const pregnancyStart = isBirth ? iso(addWeeks(parseISO(event), -w.pregnancyWeeks)) : undefined;
  const pregnancyStartMonth = pregnancyStart?.slice(0, 7);
  const mother = parents.find((p) => p.role === "matka");
  const father = parents.find((p) => p.role === "ojciec");

  // Fixed-term / trial employment that ends after the 3rd month of pregnancy is extended until birth.
  const kpExtended = (p: InsurancePeriod) =>
    !!pregnancyStart &&
    p.title === "umowa_o_prace" &&
    p.to !== undefined &&
    p.terminationReason === undefined &&
    p.to > iso(addMonths(parseISO(pregnancyStart), w.kpFixedTermPregnancyMonth)) &&
    p.to < event;

  // --- umowa-dla-pozoru ------------------------------------------------------------------------
  if (mother && pregnancyStart) {
    const threshold = iso(addMonths(parseISO(pregnancyStart), -w.recentInsuranceMonths));
    const recent = mother.periods.filter((p) => p.sickness !== "brak" && p.from >= threshold && p.from <= event);
    if (recent.length) {
      const series = monthlySeries(mother).filter((m) => m.month >= recent[0].from.slice(0, 7));
      const high = (avg(series.map((s) => s.amount)) ?? mother.contractSalary ?? 0) > w.highBaseMinWageMultiple * params.minWage;
      add({
        id: "umowa-dla-pozoru",
        severity: "warning",
        title: "Ryzyko zakwestionowania umowy lub działalności",
        text:
          `Ubezpieczenie rozpoczęło się ${recent[0].from} – krótko przed ciążą lub w jej trakcie${high ? ", z wysoką podstawą" : ""}. ` +
          "ZUS może sprawdzić, czy umowa lub działalność są wykonywane naprawdę, i wydać decyzję o niepodleganiu ubezpieczeniu. " +
          "Zachowaj dowody faktycznej pracy (umowa, ewidencja czasu, korespondencja, faktury, przelewy).",
        source: WARNING_SOURCES.sham,
      });
    }
  }

  // --- podwyzszenie-podstawy -------------------------------------------------------------------
  for (const parent of parents) {
    if (!pregnancyStartMonth || !parent.declaredBase?.length) continue;
    const before = avg(parent.declaredBase.filter((d) => d.month < pregnancyStartMonth).map((d) => d.amount));
    const after = parent.declaredBase.filter((d) => d.month >= pregnancyStartMonth).map((d) => d.amount);
    const maxAfter = after.length ? Math.max(...after) : undefined;
    if (before && maxAfter && maxAfter > before * (1 + w.baseIncreaseThreshold)) {
      add({
        id: "podwyzszenie-podstawy",
        severity: "warning",
        title: "Podwyższona podstawa składek w ciąży",
        text:
          `Deklarowana podstawa wzrosła z ok. ${formatPLN(round2(before))} do ${formatPLN(maxAfter)} ` +
          `(+${Math.round((maxAfter / before - 1) * 100)}%). ZUS może zakwestionować wysokość podstawy i ustalić ją niżej, ` +
          "co obniży zasiłek. Podwyżka powinna wynikać z realnej zmiany działalności.",
        source: WARNING_SOURCES.baseIncrease,
      });
    }
  }

  // --- brak-ubezpieczenia-w-dniu-porodu ----------------------------------------------------------
  if (mother && scenario.kind !== "adopcja" && scenario.kind !== "piecza") {
    const elig = eligibility.matka;
    const coveringEvent = pickActivePeriod(mother.periods, event);
    const nowPeriod = pickActivePeriod(mother.periods, today);
    const endsBefore =
      (!coveringEvent || coveringEvent.sickness === "brak") &&
      nowPeriod &&
      nowPeriod.sickness !== "brak" &&
      nowPeriod.to !== undefined &&
      nowPeriod.to < event &&
      !kpExtended(nowPeriod);
    // A fixed-term contract extended by law until birth (art. 177 § 3 KP) keeps the insurance.
    const extendedByLaw = !!nowPeriod && kpExtended(nowPeriod);
    if (!extendedByLaw && (endsBefore || (elig && !elig.insuredOnDate && !elig.maternityEligible))) {
      add({
        id: "brak-ubezpieczenia-w-dniu-porodu",
        severity: "critical",
        title: "Brak ubezpieczenia chorobowego w dniu porodu",
        text:
          (endsBefore
            ? `Twoje ubezpieczenie kończy się ${nowPeriod!.to}, przed ${scenario.kind === "ciaza" ? "przewidywanym terminem porodu" : "dniem porodu"} (${event}). `
            : `W dniu porodu (${event}) nie podlegasz ubezpieczeniu chorobowemu. `) +
          "Zasiłek macierzyński przysługuje tylko osobie ubezpieczonej w dniu porodu. Przedłuż umowę, nie zamykaj ani nie zawieszaj działalności " +
          "i nie wyrejestrowuj się z dobrowolnego ubezpieczenia chorobowego przed porodem.",
        source: WARNING_SOURCES.insuredOnBirth,
      });
    }
  }

  // --- brak-dobrowolnego-chorobowego --------------------------------------------------------------
  for (const parent of parents) {
    const p = pickActivePeriod(parent.periods, today) ?? pickActivePeriod(parent.periods, event);
    if (p && p.sickness === "brak" && (p.title === "zlecenie" || p.title === "dzialalnosc")) {
      add({
        id: "brak-dobrowolnego-chorobowego",
        severity: "critical",
        title: `${parent.role === "matka" ? "Matka" : "Ojciec"}: brak dobrowolnego ubezpieczenia chorobowego`,
        text:
          `Przy ${p.title === "zlecenie" ? "umowie zlecenie" : "działalności gospodarczej"} ubezpieczenie chorobowe jest dobrowolne. ` +
          "Bez niego nie przysługuje zasiłek chorobowy ani macierzyński. Zgłoś je w ZUS (ZUS ZUA / ZZA) – prawo do zasiłku chorobowego " +
          `pojawi się po ${params.pregnancy.waitingDays.dobrowolne} dniach, a do macierzyńskiego wystarczy ubezpieczenie w dniu porodu.`,
        source: WARNING_SOURCES.voluntary,
      });
    }
  }

  // --- okres-wyczekiwania ----------------------------------------------------------------------
  if (scenario.kind === "ciaza") {
    for (const [role, e] of Object.entries(eligibility)) {
      if (role !== "matka" || !e.sicknessEligibleFrom || e.sicknessEligibleFrom <= today) continue;
      add({
        id: "okres-wyczekiwania",
        severity: "warning",
        title: "Okres wyczekiwania na zasiłek chorobowy",
        text:
          `Prawo do zasiłku chorobowego (np. zwolnienia w ciąży) masz dopiero od ${e.sicknessEligibleFrom}. ` +
          "Za niezdolność do pracy przed tą datą zasiłek ani wynagrodzenie chorobowe nie przysługują.",
        source: WARNING_SOURCES.waiting,
      });
    }
  }

  // --- zadluzenie-skladkowe --------------------------------------------------------------------
  for (const parent of parents) {
    const p = pickActivePeriod(parent.periods, today) ?? pickActivePeriod(parent.periods, event);
    if (!parent.contributionDebt || parent.contributionDebt <= 0 || p?.title !== "dzialalnosc") continue;
    const voluntary = p.sickness === "dobrowolne";
    add({
      id: "zadluzenie-skladkowe",
      severity: voluntary ? "critical" : "warning",
      title: "Zadłużenie składkowe",
      text:
        `Masz zadłużenie w ZUS: ${formatPLN(parent.contributionDebt)}. Zasiłek nie zostanie wypłacony, dopóki zadłużenie istniejące na dzień ` +
        "powstania prawa nie zostanie spłacone. " +
        (voluntary
          ? "Uwaga: nieopłacenie w terminie składki na dobrowolne ubezpieczenie chorobowe może oznaczać ustanie tego ubezpieczenia – a wtedy utratę prawa do zasiłku. "
          : "") +
        "Sprawdź stan konta na PUE/eZUS i ureguluj zaległość przed porodem.",
      source: WARNING_SOURCES.debt,
    });
  }

  // --- termin-21-dni ---------------------------------------------------------------------------
  if (isBirth) {
    const deadline = iso(addDays(parseISO(event), params.deadlines.longApplicationDaysAfterBirth));
    const daysLeft = differenceInCalendarDays(parseISO(deadline), parseISO(today));
    if (daysLeft >= 0) {
      const soon = scenario.kind === "urodzenie" && daysLeft <= w.deadlineWarnDays;
      add({
        id: "termin-21-dni",
        severity: soon ? "warning" : "info",
        title: "Wniosek o cały urlop – 21 dni po porodzie",
        text:
          `Wniosek o urlop macierzyński i cały rodzicielski (zasiłek 81,5% za cały okres) można złożyć tylko w ciągu ` +
          `${params.deadlines.longApplicationDaysAfterBirth} dni po porodzie – do ${deadline}` +
          (soon ? ` (zostało ${daysLeft} dni).` : ".") +
          " Później zasiłek wyniesie 100% za macierzyński i 70% za rodzicielski.",
        source: WARNING_SOURCES.longApplication,
      });
    }
  }

  // --- niewykorzystane-9-tygodni --------------------------------------------------------------
  if (plan) {
    const fatherWeeks = plan.parental.filter((x) => x.parent === "ojciec").reduce((s, x) => s + x.weeks, 0);
    if (father && fatherWeeks < params.nonTransferableWeeks) {
      add({
        id: "niewykorzystane-9-tygodni",
        severity: "info",
        title: "Niewykorzystane tygodnie ojca",
        text:
          `Ojciec planuje ${fatherWeeks} z ${params.nonTransferableWeeks} tygodni urlopu rodzicielskiego, które przysługują tylko jemu. ` +
          "Nie można ich przenieść na matkę – niewykorzystane przepadają.",
        source: WARNING_SOURCES.nonTransferable,
      });
    }

    // --- lacze-prace ----------------------------------------------------------------------------
    const combined = plan.parental.filter((x) => (x.workFraction ?? 0) > 0);
    if (combined.length) {
      add({
        id: "lacze-prace",
        severity: "info",
        title: "Łączenie urlopu rodzicielskiego z pracą",
        text:
          `Pracując w wymiarze do ${params.combineWork.maxWorkFraction} etatu, urlop rodzicielski wydłuża się proporcjonalnie, a zasiłek jest ` +
          "odpowiednio niższy. Wniosek o łączenie składa się pracodawcy co najmniej 21 dni przed podjęciem pracy.",
        source: WARNING_SOURCES.combineWork,
      });
    }
  }

  // --- ojcowski-12-miesiecy ------------------------------------------------------------------
  if (father && scenario.kind !== "piecza") {
    const deadline = iso(addMonths(parseISO(event), scenario.kind === "adopcja" ? params.paternity.adoptionMonthsFromRuling : params.paternity.untilChildMonths));
    add({
      id: "ojcowski-12-miesiecy",
      severity: "info",
      title: "Termin urlopu ojcowskiego",
      text:
        `Urlop ojcowski (${params.paternity.weeks} tygodnie, w 1 lub 2 częściach) trzeba wykorzystać do ${deadline}` +
        `${scenario.kind === "adopcja" ? " (12 miesięcy od uprawomocnienia postanowienia o przysposobieniu)" : " (do ukończenia przez dziecko 12 miesięcy)"}. Później przepada.`,
      source: WARNING_SOURCES.paternity,
    });
  }

  // --- ochrona-kp ----------------------------------------------------------------------------
  if (mother) {
    const emp = pickActivePeriod(mother.periods, today);
    if (emp?.title === "umowa_o_prace") {
      const extended = kpExtended(emp);
      add({
        id: "ochrona-kp",
        severity: "info",
        title: "Ochrona pracownicy w ciąży i na urlopach",
        text:
          "Pracodawca nie może wypowiedzieć ani rozwiązać umowy w czasie ciąży i urlopów związanych z rodzicielstwem (poza wyjątkami, np. likwidacja, " +
          "upadłość, rozwiązanie z winy pracownika). Umowa na czas określony lub na okres próbny dłuższy niż 1 miesiąc, która rozwiązałaby się " +
          `po upływie ${w.kpFixedTermPregnancyMonth}. miesiąca ciąży, przedłuża się do dnia porodu.` +
          (extended ? ` Twoja umowa kończy się ${emp.to} – powinna zostać przedłużona do dnia porodu.` : "") +
          " Ochrona nie dotyczy umów zlecenia ani działalności gospodarczej.",
        source: WARNING_SOURCES.kpProtection,
      });
    }
  }

  // --- zmiana-zatrudnienia-w-ciazy ------------------------------------------------------------
  if (mother && pregnancyStartMonth) {
    const windowStart = format(addMonths(parseISO(`${event.slice(0, 7)}-01`), -12), "yyyy-MM");
    const series = mother.incomes.filter((m) => m.month >= windowStart && m.month < event.slice(0, 7));
    const before = avg(series.filter((m) => m.month < pregnancyStartMonth).map((m) => m.gross));
    const after = avg(series.filter((m) => m.month >= pregnancyStartMonth).map((m) => m.gross));
    const employments = mother.periods.filter((p) => p.title === "umowa_o_prace" && (p.to === undefined || p.to >= `${windowStart}-01`));
    const fractions = new Set(employments.map((p) => p.workTimeFraction ?? 1));
    const payChange = before && after ? Math.abs(after / before - 1) : 0;
    if (payChange > w.incomeChangeThreshold || fractions.size > 1) {
      add({
        id: "zmiana-zatrudnienia-w-ciazy",
        severity: "warning",
        title: "Zmiana zatrudnienia lub zarobków w okresie liczenia podstawy",
        text:
          (fractions.size > 1
            ? "W ciągu 12 miesięcy przed porodem zmienił się wymiar etatu. "
            : `Zarobki w ciąży różnią się o ok. ${Math.round(payChange * 100)}% od średniej sprzed ciąży. `) +
          "Podstawa zasiłku to średnia z 12 miesięcy, więc zmiana wpłynie na jego wysokość, a nagły wzrost może zostać zweryfikowany przez ZUS.",
        source: WARNING_SOURCES.employmentChange,
      });
    }
  }

  return out
    .map((x, i) => ({ x, i }))
    .sort((a, b) => SEVERITY_ORDER[a.x.severity] - SEVERITY_ORDER[b.x.severity] || a.i - b.i)
    .map(({ x }) => x);
}
