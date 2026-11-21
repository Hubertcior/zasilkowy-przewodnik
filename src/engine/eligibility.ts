import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { formatPLN } from "./money";
import type { Params } from "./params";
import type { InsurancePeriod, InsuranceTitle, ParentData, Scenario, SicknessInsurance } from "./types";

/**
 * Legal sources (u.z. = ustawa zasiłkowa, KP = Kodeks pracy).
 * Article numbers kept in one place for verification.
 */
export const ELIGIBILITY_SOURCES = {
  maternityInsured: "art. 29 ust. 1 u.z.",
  maternityNoWaiting: "art. 29 u.z. (zasiłek macierzyński bez okresu wyczekiwania)",
  maternityAfterTermination: "art. 30 u.z. (ustanie zatrudnienia w ciąży z powodu upadłości lub likwidacji pracodawcy)",
  sicknessWaiting: "art. 4 ust. 1 u.z.",
  waitingPreviousPeriods: "art. 4 ust. 2 u.z. (wliczanie poprzednich okresów przy przerwie do 30 dni)",
  payer: "art. 61 ust. 1 u.z.",
  documents: "rozporządzenie w sprawie dokumentów do zasiłków (Dz.U. 2026 poz. 1316)",
} as const;

export type BenefitKind = "macierzynski" | "chorobowy";

export interface EligibilityResult {
  insuredOnDate: boolean;
  /** Date the check was made for (birth / due date / child acceptance / onDate). */
  checkedOn: string;
  activePeriod?: InsurancePeriod;
  sickness: SicknessInsurance;
  maternityEligible: boolean;
  /** First day the sickness benefit is payable (after the waiting period). */
  sicknessEligibleFrom?: string;
  /** Benefit the forms/attachments refer to. */
  benefit: BenefitKind;
  payer: "platnik" | "ZUS";
  payerReason: string;
  whereToFile: string;
  forms: string[];
  attachments: string[];
  reasons: string[];
  sources: string[];
  /** JDG contribution debt on the day the right arose – passed on to warnings (KAN-19). */
  contributionDebt?: number;
}

const TITLE_LABEL: Record<InsuranceTitle, string> = {
  umowa_o_prace: "umowa o pracę",
  zlecenie: "umowa zlecenie",
  dzialalnosc: "działalność gospodarcza",
  inne: "inny tytuł",
};

const TITLE_PRIORITY: InsuranceTitle[] = ["umowa_o_prace", "zlecenie", "dzialalnosc", "inne"];

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function covers(p: InsurancePeriod, date: string): boolean {
  return p.from <= date && (p.to === undefined || p.to >= date);
}

/** The date that decides the right: birth, child acceptance, due date, or an explicit onDate. */
export function scenarioDate(scenario: Scenario): string {
  switch (scenario.kind) {
    case "ciaza":
      return scenario.dueDate;
    case "urodzenie":
      return scenario.birthDate;
    case "adopcja":
    case "piecza":
      return scenario.acceptDate;
  }
}

/** Period covering `date`: sickness-insured titles first, employment contract preferred. */
export function pickActivePeriod(periods: InsurancePeriod[], date: string): InsurancePeriod | undefined {
  const covering = periods.filter((p) => covers(p, date));
  const rank = (p: InsurancePeriod) => (p.sickness === "brak" ? 10 : 0) + TITLE_PRIORITY.indexOf(p.title);
  return covering.sort((a, b) => rank(a) - rank(b))[0];
}

/**
 * Start of the sickness-insurance chain containing `date`.
 * Earlier periods count towards the waiting period if the break did not exceed 30 days.
 */
function waitingChainStart(periods: InsurancePeriod[], date: string, maxGapDays: number): string | undefined {
  const insured = periods
    .filter((p) => p.sickness !== "brak" && p.from <= date)
    .sort((a, b) => a.from.localeCompare(b.from));
  let start: string | undefined;
  let end: string | undefined;
  let open = false;
  for (const p of insured) {
    const gap = start === undefined || open || end === undefined ? undefined : differenceInCalendarDays(parseISO(p.from), parseISO(end)) - 1;
    const joins = start !== undefined && (open || (gap !== undefined && gap <= maxGapDays));
    if (!joins) {
      start = p.from;
      end = p.to;
      open = p.to === undefined;
    } else if (p.to === undefined) {
      open = true;
    } else if (!open && (end === undefined || p.to > end)) {
      end = p.to;
    }
  }
  return start;
}

/** The last employment contract that ended before `date` (for the bankruptcy/liquidation rule). */
function lastEndedEmployment(periods: InsurancePeriod[], date: string): InsurancePeriod | undefined {
  return periods
    .filter((p) => p.title === "umowa_o_prace" && p.to !== undefined && p.to < date)
    .sort((a, b) => b.to!.localeCompare(a.to!))[0];
}

export function checkEligibility(parent: ParentData, scenario: Scenario, params: Params, onDate?: string): EligibilityResult {
  const checkedOn = onDate ?? scenarioDate(scenario);
  const benefit: BenefitKind = scenario.kind === "ciaza" ? "chorobowy" : "macierzynski";
  const reasons: string[] = [];
  const sources = new Set<string>();

  const active = pickActivePeriod(parent.periods, checkedOn);
  const sickness: SicknessInsurance = active?.sickness ?? "brak";
  const insuredOnDate = !!active && sickness !== "brak";

  // --- Insurance status -----------------------------------------------------------
  let maternityEligible = false;
  let afterTermination = false;
  if (!active) {
    reasons.push(`W dniu ${checkedOn} nie masz żadnego tytułu do ubezpieczeń (brak aktywnej umowy ani działalności).`);
    const ended = lastEndedEmployment(parent.periods, checkedOn);
    if (ended) {
      reasons.push(`Umowa o pracę${ended.payerName ? ` z ${ended.payerName}` : ""} zakończyła się ${ended.to}, czyli przed tą datą.`);
      if (
        scenario.kind !== "adopcja" &&
        scenario.kind !== "piecza" &&
        (ended.terminationReason === "upadlosc" || ended.terminationReason === "likwidacja")
      ) {
        afterTermination = true;
        reasons.push(
          "Umowę rozwiązano z powodu upadłości lub likwidacji pracodawcy. Jeśli stało się to w czasie ciąży, " +
            "przysługuje zasiłek macierzyński wypłacany przez ZUS do dnia porodu i za okres odpowiadający urlopowi.",
        );
        sources.add(ELIGIBILITY_SOURCES.maternityAfterTermination);
      }
    }
  } else if (sickness === "brak") {
    reasons.push(
      `W dniu ${checkedOn} masz tytuł do ubezpieczeń (${TITLE_LABEL[active.title]}), ale nie podlegasz ubezpieczeniu chorobowemu.`,
    );
    if (active.title !== "umowa_o_prace") {
      reasons.push(
        `Przy tytule „${TITLE_LABEL[active.title]}” ubezpieczenie chorobowe jest dobrowolne. Bez niego nie przysługuje zasiłek ` +
          "chorobowy ani macierzyński. Ubezpieczenie można zgłosić (ZUS ZUA), ale prawo do zasiłku chorobowego pojawi się po 90 dniach.",
      );
    }
  } else {
    reasons.push(
      `W dniu ${checkedOn} podlegasz ubezpieczeniu chorobowemu (${sickness === "obowiazkowe" ? "obowiązkowemu" : "dobrowolnemu"}) ` +
        `z tytułu: ${TITLE_LABEL[active.title]}${active.payerName ? ` (${active.payerName})` : ""}.`,
    );
  }

  // --- Maternity ------------------------------------------------------------------
  if (insuredOnDate) {
    maternityEligible = true;
    sources.add(ELIGIBILITY_SOURCES.maternityInsured).add(ELIGIBILITY_SOURCES.maternityNoWaiting);
    const what = scenario.kind === "adopcja" || scenario.kind === "piecza" ? "przyjęcia dziecka" : "porodu";
    reasons.push(
      `Zasiłek macierzyński przysługuje, bo w dniu ${what} podlegasz ubezpieczeniu chorobowemu. Nie ma okresu wyczekiwania.`,
    );
    reasons.push(
      active!.title === "umowa_o_prace"
        ? "Jako pracownik dostajesz zasiłek za okres udzielonego urlopu (macierzyńskiego, rodzicielskiego itd.)."
        : "Jako osoba niebędąca pracownikiem dostajesz zasiłek za okres odpowiadający okresowi urlopu.",
    );
  } else if (afterTermination) {
    maternityEligible = true;
  } else {
    sources.add(ELIGIBILITY_SOURCES.maternityInsured);
    reasons.push("Zasiłek macierzyński nie przysługuje, bo w tym dniu nie podlegasz ubezpieczeniu chorobowemu.");
  }

  // --- Sickness benefit waiting period ---------------------------------------------
  let sicknessEligibleFrom: string | undefined;
  if (insuredOnDate) {
    const waiting = params.pregnancy.waitingDays[sickness as "obowiazkowe" | "dobrowolne"];
    const chainStart = waitingChainStart(parent.periods, checkedOn, params.pregnancy.waitingMaxGapDays)!;
    sicknessEligibleFrom = iso(addDays(parseISO(chainStart), waiting));
    sources.add(ELIGIBILITY_SOURCES.sicknessWaiting);
    if (chainStart < active!.from) sources.add(ELIGIBILITY_SOURCES.waitingPreviousPeriods);
    const kind = sickness === "obowiazkowe" ? "obowiązkowym" : "dobrowolnym";
    reasons.push(
      `Zasiłek chorobowy: przy ubezpieczeniu ${kind} okres wyczekiwania to ${waiting} dni nieprzerwanego ubezpieczenia ` +
        `(liczone od ${chainStart}${chainStart < active!.from ? `, z wliczeniem poprzednich okresów, bo przerwa nie przekroczyła ${params.pregnancy.waitingMaxGapDays} dni` : ""}). ` +
        `Prawo do zasiłku chorobowego od ${sicknessEligibleFrom}.`,
    );
  }

  // --- Who pays ---------------------------------------------------------------------
  const period = active ?? (afterTermination ? lastEndedEmployment(parent.periods, checkedOn) : undefined);
  let payer: EligibilityResult["payer"] = "ZUS";
  let payerReason: string;
  if (afterTermination) {
    payerReason = "Po ustaniu zatrudnienia zasiłek wypłaca ZUS.";
  } else if (!period) {
    payerReason = "Brak płatnika składek – ewentualne świadczenia ustala ZUS.";
  } else if (period.title === "dzialalnosc") {
    payerReason = "Przy działalności gospodarczej zasiłki zawsze wypłaca ZUS.";
  } else if (period.payerInsuredCount === undefined) {
    payerReason =
      `Brak informacji, ilu ubezpieczonych zgłasza płatnik – przyjęto, że wypłaca ZUS. Jeśli płatnik zgłasza do ubezpieczenia ` +
      `chorobowego więcej niż ${params.payerThresholdInsured} osób, zasiłek wypłaci on sam.`;
  } else if (period.payerInsuredCount > params.payerThresholdInsured) {
    payer = "platnik";
    payerReason =
      `Płatnik zgłasza do ubezpieczenia chorobowego ${period.payerInsuredCount} osób, czyli więcej niż ${params.payerThresholdInsured} ` +
      `(stan na 30 listopada poprzedniego roku), więc sam ustala i wypłaca zasiłek.`;
  } else {
    payerReason =
      `Płatnik zgłasza do ubezpieczenia chorobowego ${period.payerInsuredCount} osób, czyli nie więcej niż ${params.payerThresholdInsured}, ` +
      `więc zasiłek ustala i wypłaca ZUS.`;
  }
  sources.add(ELIGIBILITY_SOURCES.payer);
  reasons.push(payerReason);

  // --- Documents --------------------------------------------------------------------
  // Documents only make sense when there is a right to claim (sickness-insured, or the post-termination rule).
  const docsTitle = insuredOnDate || afterTermination ? period?.title : undefined;
  const { forms, attachments, whereToFile } = documents(docsTitle, payer, benefit, scenario, afterTermination);
  sources.add(ELIGIBILITY_SOURCES.documents);

  // --- Contribution debt (JDG) ------------------------------------------------------
  let contributionDebt: number | undefined;
  if (period?.title === "dzialalnosc" && parent.contributionDebt && parent.contributionDebt > 0) {
    contributionDebt = parent.contributionDebt;
    reasons.push(
      `Na dzień powstania prawa masz zadłużenie składkowe ${formatPLN(contributionDebt)}. Może to wstrzymać wypłatę zasiłku ` +
        "do czasu spłaty (szczegóły w ostrzeżeniach).",
    );
  }

  return {
    insuredOnDate,
    checkedOn,
    activePeriod: active,
    sickness,
    maternityEligible,
    sicknessEligibleFrom,
    benefit,
    payer,
    payerReason,
    whereToFile,
    forms,
    attachments,
    reasons,
    sources: [...sources],
    contributionDebt,
  };
}

function documents(
  title: InsuranceTitle | undefined,
  payer: "platnik" | "ZUS",
  benefit: BenefitKind,
  scenario: Scenario,
  afterTermination: boolean,
): { forms: string[]; attachments: string[]; whereToFile: string } {
  const forms: string[] = [];
  const attachments: string[] = [];
  let whereToFile: string;

  if (afterTermination) {
    forms.push("ZAM");
    whereToFile = "Wniosek ZAM składasz bezpośrednio w ZUS (PUE/eZUS lub placówka).";
  } else if (benefit === "chorobowy") {
    forms.push("e-ZLA (kod „B” – niezdolność do pracy w okresie ciąży)");
    switch (title) {
      case "umowa_o_prace":
        if (payer === "ZUS") forms.push("Z-3", "ZAS-12");
        whereToFile =
          payer === "platnik"
            ? "Lekarz wystawia e-ZLA, które trafia do pracodawcy. Poinformuj pracodawcę o nieobecności – on wypłaca zasiłek."
            : "Lekarz wystawia e-ZLA. Poinformuj pracodawcę – przekaże do ZUS zaświadczenie Z-3 (a w razie potrzeby oświadczenie ZAS-12). Zasiłek wypłaca ZUS.";
        break;
      case "zlecenie":
        forms.push("Z-3a");
        whereToFile =
          payer === "platnik"
            ? "e-ZLA trafia do zleceniodawcy, który wypłaca zasiłek."
            : "e-ZLA trafia do ZUS; zleceniodawca przekazuje do ZUS zaświadczenie Z-3a. Zasiłek wypłaca ZUS.";
        break;
      case "dzialalnosc":
        forms.push("ZAS-53");
        whereToFile = "e-ZLA trafia do ZUS. Złóż w ZUS wniosek ZAS-53 (PUE/eZUS). Zasiłek wypłaca ZUS.";
        break;
      default:
        whereToFile = "Brak ubezpieczenia chorobowego – nie ma gdzie złożyć wniosku o zasiłek chorobowy.";
    }
  } else {
    switch (title) {
      case "umowa_o_prace":
        forms.push("Wniosek o urlop macierzyński (może być łącznie z rodzicielskim) – do pracodawcy");
        if (payer === "ZUS") forms.push("Z-3");
        whereToFile =
          payer === "platnik"
            ? "Wniosek o urlop składasz u pracodawcy – on ustala i wypłaca zasiłek macierzyński."
            : "Wniosek o urlop składasz u pracodawcy. Pracodawca przesyła do ZUS zaświadczenie Z-3 wraz z dokumentami; zasiłek wypłaca ZUS.";
        break;
      case "zlecenie":
        forms.push("ZAM", "Z-3a");
        whereToFile =
          payer === "platnik"
            ? "Wniosek ZAM składasz u zleceniodawcy (płatnika) – on wypłaca zasiłek."
            : "Wniosek ZAM składasz w ZUS albo u zleceniodawcy, który przekaże go do ZUS razem z zaświadczeniem Z-3a.";
        break;
      case "dzialalnosc":
        forms.push("ZAM");
        whereToFile = "Wniosek ZAM składasz bezpośrednio w ZUS (PUE/eZUS lub placówka).";
        break;
      case "inne":
        forms.push("ZAM");
        whereToFile =
          payer === "platnik" ? "Wniosek ZAM składasz u płatnika składek." : "Wniosek ZAM składasz w ZUS (PUE/eZUS lub placówka).";
        break;
      default:
        whereToFile = "Brak ubezpieczenia chorobowego – zasiłek macierzyński nie przysługuje.";
    }
  }

  if (title || afterTermination) {
    switch (scenario.kind) {
      case "ciaza":
        attachments.push("Zaświadczenie lekarskie o przewidywanej dacie porodu (jeśli urlop macierzyński zaczniesz przed porodem)");
        break;
      case "urodzenie":
        if (scenario.stillbirth) attachments.push("Zaświadczenie o martwym urodzeniu dziecka");
        else attachments.push("Skrócony odpis aktu urodzenia dziecka");
        if (scenario.zaZyciem) attachments.push("Zaświadczenie „Za życiem” (ciężkie i nieodwracalne upośledzenie albo nieuleczalna choroba)");
        if (scenario.prematurity) attachments.push("Zaświadczenie ze szpitala o hospitalizacji dziecka (urlop uzupełniający)");
        if (scenario.childDeath) attachments.push("Skrócony odpis aktu zgonu dziecka");
        break;
      case "adopcja":
        attachments.push("Postanowienie sądu o przysposobieniu albo o wszczęciu postępowania o przysposobienie (z datą przyjęcia dziecka)");
        break;
      case "piecza":
        attachments.push("Postanowienie sądu lub umowa o umieszczeniu dziecka w rodzinie zastępczej (z datą przyjęcia dziecka)");
        break;
    }
  }

  return { forms, attachments, whereToFile };
}
