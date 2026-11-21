import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { checkEligibility, pickActivePeriod } from "./eligibility";
import { formatPLN, round2 } from "./money";
import type { Params } from "./params";
import type { BenefitPeriod, InsurancePeriod, ParentData, PeriodType } from "./types";

/** Legal sources (u.z. = ustawa zasiłkowa, KP = Kodeks pracy). */
export const PREGNANCY_SOURCES = {
  rate: "art. 11 ust. 2 pkt 2 u.z. (100% w okresie ciąży)",
  employerPay: "art. 92 § 1 KP (wynagrodzenie chorobowe: 33 dni, 14 dni od roku ukończenia 50 lat)",
  waiting: "art. 4 u.z.",
  period270: "art. 8 u.z. (okres zasiłkowy – 270 dni w ciąży)",
  merge: "art. 9 ust. 2 u.z.",
  afterInsurance: "art. 7 u.z. (niezdolność powstała do 14 dni po ustaniu ubezpieczenia)",
  equalToMaternity: "art. 30 ust. 3 u.z. (zasiłek w wysokości zasiłku macierzyńskiego po rozwiązaniu umowy w ciąży)",
  rehabilitation: "art. 18–19 u.z. (świadczenie rehabilitacyjne)",
} as const;

export interface PregnancyInput {
  parent: ParentData;
  base: number;
  illnessFrom: string;
  illnessTo: string;
  /** e-ZLA with code "B" (pregnancy). */
  codeB: boolean;
  dueDate?: string;
}

export interface PregnancyResult {
  eligible: boolean;
  reasons: string[];
  /** wynagrodzenie_chorobowe, chorobowy_ciaza, zasilek_wys_macierzynskiego */
  periods: BenefitPeriod[];
  daysUsed: number;
  daysLeft: number;
  info: string[];
  sources: string[];
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const pct = (r: number) => `${round2(r * 100).toString().replace(".", ",")}%`;
const SPECIAL_TERMINATION = ["upadlosc", "likwidacja", "smierc_pracodawcy", "naruszenie_prawa_wyrok"] as const;

function period(
  type: PeriodType,
  from: Date,
  days: number,
  base: number,
  rate: number,
  payer: BenefitPeriod["payer"],
  parent: BenefitPeriod["parent"],
): BenefitPeriod {
  const monthlyAmount = round2(base * rate);
  return {
    type,
    parent,
    from: iso(from),
    to: iso(addDays(from, days - 1)),
    days,
    rate,
    base,
    monthlyAmount,
    total: round2((days * monthlyAmount) / 30),
    payer,
  };
}

function rehabilitationInfo(p: Params): string {
  const r = p.rehabilitation;
  return (
    `Po wyczerpaniu okresu zasiłkowego możesz złożyć w ZUS wniosek o świadczenie rehabilitacyjne – jeśli dalsze leczenie lub rehabilitacja ` +
    `rokują odzyskanie zdolności do pracy. Przysługuje do ${r.maxMonths} miesięcy: ${pct(r.firstMonthsRate)} podstawy przez pierwsze ` +
    `${r.firstMonths} miesiące, potem ${pct(r.laterRate)}, a w okresie ciąży ${pct(r.pregnancyRate)}. O prawie decyduje lekarz orzecznik ZUS.`
  );
}

/** Employment that ended (before `date`) in a way that gives the benefit equal to maternity benefit. */
function specialTermination(periods: InsurancePeriod[], date: string): InsurancePeriod | undefined {
  return periods
    .filter(
      (p) =>
        p.title === "umowa_o_prace" &&
        p.to !== undefined &&
        p.to < date &&
        (SPECIAL_TERMINATION as readonly string[]).includes(p.terminationReason ?? ""),
    )
    .sort((a, b) => b.to!.localeCompare(a.to!))[0];
}

export function calcPregnancy(input: PregnancyInput, params: Params): PregnancyResult {
  const { parent, base, illnessFrom, codeB, dueDate } = input;
  const p = params;
  const reasons: string[] = [];
  const info: string[] = [];
  const sources = new Set<string>();
  const periods: BenefitPeriod[] = [];
  const maxDays = p.pregnancy.maxBenefitDays;
  const rate = codeB ? p.rates.pregnancySickness : p.rates.standardSickness;

  // Illness ends at the latest the day before birth – then maternity benefit starts.
  let illnessTo = input.illnessTo;
  if (dueDate && dueDate <= illnessTo) {
    illnessTo = iso(addDays(parseISO(dueDate), -1));
    info.push(`Niezdolność trwa do porodu – od dnia porodu (${dueDate}) przysługuje zasiłek macierzyński.`);
  }
  const result = (eligible: boolean, daysUsed = 0): PregnancyResult => ({
    eligible,
    reasons,
    periods,
    daysUsed,
    daysLeft: Math.max(maxDays - daysUsed, 0),
    info,
    sources: [...sources],
  });

  const active = pickActivePeriod(parent.periods, illnessFrom);

  // --- Not insured: special termination or benefit after insurance ends ----------------------------
  if (!active || active.sickness === "brak") {
    const special = specialTermination(parent.periods, illnessFrom);
    if (special && dueDate) {
      sources.add(PREGNANCY_SOURCES.equalToMaternity);
      const from = addDays(parseISO(special.to!), 1);
      const days = differenceInCalendarDays(parseISO(dueDate), from);
      if (days > 0) {
        periods.push(period("zasilek_wys_macierzynskiego", from, days, base, p.rates.benefitEqualToMaternity, "ZUS", parent.role));
      }
      const why: Record<string, string> = {
        upadlosc: "upadłości pracodawcy",
        likwidacja: "likwidacji pracodawcy",
        smierc_pracodawcy: "śmierci pracodawcy",
        naruszenie_prawa_wyrok: "naruszenia przepisów (potwierdzonego prawomocnym wyrokiem)",
      };
      reasons.push(
        `Umowę o pracę rozwiązano w czasie ciąży z powodu ${why[special.terminationReason!]} (${special.to}). Do dnia porodu przysługuje ` +
          `zasiłek w wysokości zasiłku macierzyńskiego: ${pct(p.rates.benefitEqualToMaternity)} podstawy (${formatPLN(round2(base * p.rates.benefitEqualToMaternity))} ` +
          "miesięcznie), wypłaca ZUS. Warunek: nie zapewniono Ci innego zatrudnienia.",
        "Po porodzie przysługuje zasiłek macierzyński.",
      );
      return result(true, 0);
    }

    const lastEnded = parent.periods
      .filter((x) => x.sickness !== "brak" && x.to !== undefined && x.to < illnessFrom)
      .sort((a, b) => b.to!.localeCompare(a.to!))[0];
    const gap = lastEnded ? differenceInCalendarDays(parseISO(illnessFrom), parseISO(lastEnded.to!)) : undefined;
    if (lastEnded && gap !== undefined && gap <= p.pregnancy.afterInsuranceIllnessWithinDays) {
      sources.add(PREGNANCY_SOURCES.afterInsurance).add(PREGNANCY_SOURCES.period270);
      const from = parseISO(illnessFrom);
      const total = differenceInCalendarDays(parseISO(illnessTo), from) + 1;
      const days = Math.min(total, maxDays);
      periods.push(period("chorobowy_ciaza", from, days, base, rate, "ZUS", parent.role));
      reasons.push(
        `Ubezpieczenie ustało ${lastEnded.to}, a niezdolność do pracy powstała ${gap} dni później (nie później niż ${p.pregnancy.afterInsuranceIllnessWithinDays} dni). ` +
          `Zasiłek chorobowy po ustaniu ubezpieczenia wypłaca ZUS – w ciąży do ${maxDays} dni.`,
      );
      if (total > maxDays) info.push(`Niezdolność przekracza ${maxDays} dni – zasiłek obcięto do limitu.`, rehabilitationInfo(p));
      return result(true, days);
    }

    reasons.push(
      !active
        ? `W dniu ${illnessFrom} nie podlegasz ubezpieczeniu chorobowemu i nie ma podstaw do zasiłku po ustaniu ubezpieczenia – zasiłek chorobowy nie przysługuje.`
        : `Masz tytuł do ubezpieczeń, ale bez ubezpieczenia chorobowego – zasiłek chorobowy w ciąży nie przysługuje.`,
    );
    return result(false);
  }

  // --- Insured: waiting period ---------------------------------------------------------------------
  const elig = checkEligibility(parent, { kind: "ciaza", dueDate: dueDate ?? illnessTo }, p, illnessFrom);
  sources.add(PREGNANCY_SOURCES.waiting);
  const eligibleFrom = elig.sicknessEligibleFrom!;
  if (eligibleFrom > illnessTo) {
    reasons.push(
      `Okres wyczekiwania (${p.pregnancy.waitingDays[active.sickness as "obowiazkowe" | "dobrowolne"]} dni nieprzerwanego ubezpieczenia) ` +
        `upływa dopiero ${eligibleFrom} – za tę niezdolność do pracy zasiłek nie przysługuje.`,
    );
    return result(false);
  }
  let cursor = parseISO(illnessFrom);
  if (eligibleFrom > illnessFrom) {
    const unpaid = differenceInCalendarDays(parseISO(eligibleFrom), cursor);
    reasons.push(`Pierwsze ${unpaid} dni niezdolności przypada w okresie wyczekiwania – za nie nic nie przysługuje. Prawo od ${eligibleFrom}.`);
    cursor = parseISO(eligibleFrom);
  }

  const totalDays = differenceInCalendarDays(parseISO(illnessTo), cursor) + 1;
  let remaining = Math.min(totalDays, maxDays);
  const daysUsed = remaining;
  sources.add(PREGNANCY_SOURCES.rate).add(PREGNANCY_SOURCES.period270);

  reasons.push(
    codeB
      ? `Zwolnienie z kodem „B” (ciąża): ${pct(rate)} podstawy – ${formatPLN(round2(base * rate))} miesięcznie.`
      : `Zwolnienie bez kodu „B”: ${pct(rate)} podstawy. Jeśli niezdolność wynika z ciąży, poproś lekarza o kod „B” – wtedy przysługuje ${pct(p.rates.pregnancySickness)}.`,
  );

  // Employee: employer-paid sick pay first (per calendar year).
  if (active.title === "umowa_o_prace") {
    const limit = (parent.age ?? 0) >= 50 ? p.pregnancy.employerPaidDays.from50 : p.pregnancy.employerPaidDays.under50;
    const left = Math.max(limit - (parent.sickDaysThisYear ?? 0), 0);
    const employerDays = Math.min(left, remaining);
    sources.add(PREGNANCY_SOURCES.employerPay);
    if (employerDays > 0) {
      periods.push(period("wynagrodzenie_chorobowe", cursor, employerDays, base, rate, "pracodawca", parent.role));
      cursor = addDays(cursor, employerDays);
      remaining -= employerDays;
    }
    reasons.push(
      `Jako pracownica przez pierwsze ${limit} dni niezdolności w roku kalendarzowym ${(parent.age ?? 0) >= 50 ? "(od roku, w którym kończysz 50 lat) " : ""}` +
        `dostajesz wynagrodzenie chorobowe od pracodawcy` +
        `${parent.sickDaysThisYear ? ` (w tym roku wykorzystano już ${parent.sickDaysThisYear} dni, zostało ${left})` : ""}: ${employerDays} dni.` +
        (remaining > 0 ? ` Od kolejnego dnia zasiłek chorobowy wypłaca ${elig.payer === "platnik" ? "pracodawca (płatnik > 20 osób)" : "ZUS"}.` : ""),
    );
  } else {
    reasons.push(`Jako ${active.title === "dzialalnosc" ? "przedsiębiorczyni" : "zleceniobiorczyni"} dostajesz zasiłek chorobowy od 1. dnia niezdolności (wypłaca ${elig.payer === "platnik" ? "płatnik" : "ZUS"}).`);
  }

  if (remaining > 0) {
    periods.push(period("chorobowy_ciaza", cursor, remaining, base, rate, elig.payer, parent.role));
  }

  info.push(
    `Okres zasiłkowy w ciąży: do ${maxDays} dni. Niezdolność w ciąży otwiera nowy okres – nie dolicza się okresów sprzed ciąży.`,
  );
  if (totalDays > maxDays) {
    info.push(`Niezdolność trwa ${totalDays} dni i przekracza ${maxDays} dni – świadczenie obcięto do limitu.`, rehabilitationInfo(p));
    sources.add(PREGNANCY_SOURCES.rehabilitation);
  }
  if (elig.contributionDebt) {
    info.push(`Zadłużenie składkowe ${formatPLN(elig.contributionDebt)} może wstrzymać wypłatę do czasu spłaty.`);
  }

  return result(true, daysUsed);
}
