import { addDays, addWeeks, format, parseISO } from "date-fns";
import type { EligibilityResult } from "./eligibility";
import { scenarioDate } from "./eligibility";
import type { Entitlement } from "./entitlement";
import type { Params } from "./params";
import type { ScheduleResult } from "./schedule";
import type { InsuranceTitle, LeavePlan, ParentData, Scenario } from "./types";

// "Co i gdzie złożyć" (KAN-27): filing steps tailored to each parent's insurance title and payer.

export const LINKS = {
  forms: "https://www.zus.pl/wzory-formularzy",
  maternity: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski",
  sickness: "https://www.zus.pl/swiadczenia/zasilki/zasilek-chorobowy",
  ezla: "https://www.zus.pl/elektroniczne-zwolnienia-lekarskie-e-zla-",
  pue: "https://www.zus.pl/portal/logowanie.npi",
  mzus: "https://www.zus.pl/mzus",
  birthCertificate: "https://www.gov.pl/web/gov/uzyskaj-odpis-aktu-urodzenia",
  parentalGov: "https://www.gov.pl/web/rodzina/urlop-rodzicielski",
  pip: "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo",
} as const;

const SRC = {
  kp180: "art. 180 KP",
  kp1801: "art. 180¹ KP",
  kp1821b: "art. 182¹ᵇ KP",
  kp1821e: "art. 182¹ᵉ KP",
  kp1823: "art. 182³ KP",
  kp183: "art. 183 KP",
  rozpWnioski: "rozporządzenie w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem (Dz.U. 2025 poz. 322)",
  rozpDokumenty: "rozporządzenie w sprawie dokumentów do zasiłków (Dz.U. 2026 poz. 1316)",
  uz61: "art. 61 ustawy zasiłkowej",
  uz31: "art. 31 ust. 3 ustawy zasiłkowej",
  asc: "art. 61 ustawy – Prawo o aktach stanu cywilnego",
} as const;

export type FilingWhere = "pracodawca" | "ZUS" | "płatnik" | "USC/gov.pl";
export type FilingChannel = "PUE/eZUS" | "mZUS" | "e-mail/system kadrowy" | "gov.pl";

export interface FilingStep {
  id: string;
  title: string;
  /** Who acts: the mother, the father, both or the employer. */
  who: "mama" | "tata" | "oboje" | "pracodawca" | "zleceniodawca";
  where: FilingWhere;
  forms: string[];
  attachments: string[];
  /** Concrete date (YYYY-MM-DD) when it can be computed from the case. */
  deadline?: string;
  deadlineRule: string;
  online: { channel: FilingChannel; howTo: string[] };
  links: { label: string; url: string }[];
  source: string;
}

export interface FilingContext {
  parents: ParentData[];
  scenario: Scenario;
  eligibility: Partial<Record<"matka" | "ojciec", EligibilityResult>>;
  entitlement: Entitlement;
  schedule?: ScheduleResult;
  plan?: LeavePlan;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const minus = (date: string, days: number) => iso(addDays(parseISO(date), -days));

const PUE_HOWTO = [
  "Zaloguj się na PUE/eZUS (profil zaufany, bankowość elektroniczna lub e-dowód).",
  "Wybierz [Usługi] → [Dokumenty i wiadomości] → [Złóż wniosek] i wyszukaj formularz.",
  "Dołącz skany lub zdjęcia załączników i podpisz wniosek elektronicznie.",
];

function parentTitle(e: EligibilityResult | undefined): InsuranceTitle | undefined {
  return e?.maternityEligible || e?.insuredOnDate ? e.activePeriod?.title : undefined;
}

export function buildFilingGuide(ctx: FilingContext, params: Params): FilingStep[] {
  const { scenario, eligibility, entitlement, schedule, plan } = ctx;
  const d = params.deadlines;
  const steps: FilingStep[] = [];
  const event = scenarioDate(scenario);
  const adoption = scenario.kind === "adopcja" || scenario.kind === "piecza";
  const m = eligibility.matka;
  const f = eligibility.ojciec;
  const mTitle = parentTitle(m);
  const fTitle = parentTitle(f);
  const electronic = `Od ${d.electronicApplicationsFrom} wnioski o zasiłki można składać elektronicznie – są równoważne papierowym.`;

  // --- Pregnancy: sick leave (e-ZLA code B) ---------------------------------------------------
  if (scenario.kind === "ciaza" && mTitle) {
    const byTitle: Record<InsuranceTitle, Pick<FilingStep, "where" | "forms" | "deadlineRule">> = {
      umowa_o_prace: {
        where: m!.payer === "platnik" ? "pracodawca" : "ZUS",
        forms: m!.payer === "platnik" ? ["e-ZLA (kod „B”)"] : ["e-ZLA (kod „B”)", "Z-3 (wystawia pracodawca)", "ZAS-12 (jeśli ZUS poprosi)"],
        deadlineRule: "e-ZLA trafia automatycznie do pracodawcy i ZUS. Poinformuj pracodawcę o nieobecności niezwłocznie (najpóźniej w 2. dniu).",
      },
      zlecenie: {
        where: m!.payer === "platnik" ? "płatnik" : "ZUS",
        forms: ["e-ZLA (kod „B”)", "Z-3a (wystawia zleceniodawca)"],
        deadlineRule: "e-ZLA trafia automatycznie. Zleceniodawca przekazuje do ZUS zaświadczenie Z-3a.",
      },
      dzialalnosc: {
        where: "ZUS",
        forms: ["e-ZLA (kod „B”)", "ZAS-53"],
        deadlineRule: "Złóż ZAS-53 w ZUS po otrzymaniu e-ZLA (przy pierwszym zwolnieniu i gdy zmieniają się dane).",
      },
      inne: { where: "ZUS", forms: ["e-ZLA (kod „B”)"], deadlineRule: "e-ZLA trafia automatycznie do ZUS." },
    };
    steps.push({
      id: "l4-ciaza",
      title: "Zwolnienie lekarskie w ciąży",
      who: "mama",
      ...byTitle[mTitle],
      attachments: [],
      online: { channel: "PUE/eZUS", howTo: ["Zwolnienie zobaczysz na PUE/eZUS w zakładce [Zaświadczenia lekarskie].", ...(mTitle === "dzialalnosc" ? PUE_HOWTO.slice(1) : [])] },
      links: [
        { label: "O e-ZLA (zus.pl)", url: LINKS.ezla },
        { label: "Zasiłek chorobowy (zus.pl)", url: LINKS.sickness },
      ],
      source: `${SRC.rozpDokumenty}; ${SRC.uz61}`,
    });
  }

  // --- Maternity starting before birth ---------------------------------------------------------
  if (scenario.kind === "ciaza" && mTitle) {
    const due = event;
    steps.push({
      id: "macierzynski-przed-porodem",
      title: "Urlop macierzyński przed porodem (opcjonalnie)",
      who: "mama",
      where: mTitle === "umowa_o_prace" ? "pracodawca" : m!.payer === "platnik" ? "płatnik" : "ZUS",
      forms: mTitle === "umowa_o_prace" ? ["Wniosek o urlop macierzyński przed porodem"] : ["ZAM"],
      attachments: ["Zaświadczenie lekarskie o przewidywanej dacie porodu"],
      deadline: iso(addWeeks(parseISO(due), -d.maternityStartWeeksBeforeDue)),
      deadlineRule: `Do ${d.maternityStartWeeksBeforeDue} tygodni urlopu może przypaść przed przewidywaną datą porodu. Najwcześniejszy start podany obok.`,
      online: { channel: mTitle === "umowa_o_prace" ? "e-mail/system kadrowy" : "PUE/eZUS", howTo: mTitle === "umowa_o_prace" ? ["Złóż wniosek u pracodawcy (papierowo lub elektronicznie, jeśli pracodawca to umożliwia)."] : PUE_HOWTO },
      links: [{ label: "Wzory formularzy (zus.pl)", url: LINKS.forms }],
      source: `${SRC.kp180}; ${SRC.rozpWnioski}`,
    });
  }

  // --- Maternity + parental: the long application (21 days) -----------------------------------
  for (const [role, e, title] of [["matka", m, mTitle], ["ojciec", f, fTitle]] as const) {
    if (!title || !e?.maternityEligible) continue;
    if (role === "ojciec" && !adoption) continue; // father's maternity-related steps are covered below
    const isEmployee = title === "umowa_o_prace";
    const deadline = scenario.kind === "urodzenie" || adoption ? iso(addDays(parseISO(event), d.longApplicationDaysAfterBirth)) : undefined;
    steps.push({
      id: `wniosek-macierzynski-${role}`,
      title: adoption ? "Urlop na warunkach macierzyńskiego i rodzicielski" : "Urlop macierzyński i rodzicielski (wniosek o cały urlop)",
      who: role === "matka" ? "mama" : "tata",
      where: isEmployee ? "pracodawca" : e.payer === "platnik" ? "płatnik" : "ZUS",
      forms: isEmployee
        ? [adoption ? "Wniosek o urlop na warunkach urlopu macierzyńskiego" : "Wniosek o urlop macierzyński", "Wniosek o urlop rodzicielski (może być razem)"]
        : ["ZAM (od 24.10.2026 obejmuje dawne ZUR i ZAO)"],
      attachments: e.attachments,
      deadline,
      deadlineRule:
        `Wniosek o cały urlop (macierzyński + rodzicielski) złożony najpóźniej ${d.longApplicationDaysAfterBirth} dni po ${adoption ? "przyjęciu dziecka" : "porodzie"} ` +
        `daje 81,5% za cały okres. Później: 100% za macierzyński i 70% za rodzicielski. ${electronic}`,
      online: isEmployee
        ? { channel: "e-mail/system kadrowy", howTo: ["Złóż wnioski u pracodawcy (papier, e-mail lub system kadrowy).", "Pracodawca przekaże dokumenty do ZUS, jeśli to ZUS wypłaca zasiłek."] }
        : { channel: "PUE/eZUS", howTo: PUE_HOWTO },
      links: [
        { label: "Zasiłek macierzyński (zus.pl)", url: LINKS.maternity },
        { label: "Wzory formularzy (zus.pl)", url: LINKS.forms },
        { label: "Urlop rodzicielski (gov.pl)", url: LINKS.parentalGov },
      ],
      source: `${SRC.uz31}; ${SRC.rozpWnioski}; ${SRC.rozpDokumenty}`,
    });

    // Payer certificate when ZUS pays.
    if (e.payer === "ZUS" && (title === "umowa_o_prace" || title === "zlecenie")) {
      steps.push({
        id: `zaswiadczenie-platnika-${role}`,
        title: title === "umowa_o_prace" ? "Zaświadczenie płatnika Z-3 do ZUS" : "Zaświadczenie Z-3a od zleceniodawcy",
        who: title === "umowa_o_prace" ? "pracodawca" : "zleceniodawca",
        where: "ZUS",
        forms: [title === "umowa_o_prace" ? "Z-3" : "Z-3a"],
        attachments: [],
        deadlineRule: "Płatnik zgłaszający do 20 osób nie wypłaca zasiłku – przekazuje do ZUS zaświadczenie i Twoje dokumenty. Sprawdź na PUE/eZUS, czy ZUS je otrzymał.",
        online: { channel: "PUE/eZUS", howTo: ["Płatnik przesyła zaświadczenie elektronicznie przez PUE/eZUS.", "Status sprawy sprawdzisz na swoim koncie PUE/eZUS."] },
        links: [{ label: "Wzory formularzy (zus.pl)", url: LINKS.forms }],
        source: SRC.uz61,
      });
    }
  }

  // --- Supplementary leave -----------------------------------------------------------------------
  if (entitlement.supplementaryWeeks > 0 && mTitle) {
    const matEnd = schedule?.periods.filter((p) => p.type === "macierzynski").map((p) => p.to).sort().at(-1);
    steps.push({
      id: "uzupelniajacy",
      title: `Urlop uzupełniający (${entitlement.supplementaryWeeks} tyg.)`,
      who: "mama",
      where: mTitle === "umowa_o_prace" ? "pracodawca" : m!.payer === "platnik" ? "płatnik" : "ZUS",
      forms: mTitle === "umowa_o_prace" ? ["Wniosek o urlop uzupełniający"] : ["ZAM"],
      attachments: ["Zaświadczenie ze szpitala o pobycie dziecka (daty hospitalizacji)"],
      deadline: matEnd ? minus(matEnd, d.supplementaryApplicationDaysBeforeMaternityEnd) : undefined,
      deadlineRule: `Pracownik składa wniosek najpóźniej ${d.supplementaryApplicationDaysBeforeMaternityEnd} dni przed końcem urlopu macierzyńskiego.`,
      online: { channel: mTitle === "umowa_o_prace" ? "e-mail/system kadrowy" : "PUE/eZUS", howTo: mTitle === "umowa_o_prace" ? ["Złóż wniosek u pracodawcy."] : PUE_HOWTO },
      links: [{ label: "Zasiłek macierzyński (zus.pl)", url: LINKS.maternity }],
      source: SRC.kp1801,
    });
  }

  // --- Parental parts, combining with work, father's take-over ----------------------------------
  const parental = schedule?.periods.filter((p) => p.type === "rodzicielski") ?? [];
  for (const role of ["matka", "ojciec"] as const) {
    const e = eligibility[role];
    const title = role === "matka" ? mTitle : fTitle;
    const parts = parental.filter((p) => p.parent === role);
    if (!title || parts.length === 0) continue;
    // With the long application the mother's first part is covered by the combined application.
    const firstStart = parts[0].from;
    const combined = parts.some((p) => p.workFraction);
    steps.push({
      id: `rodzicielski-${role}`,
      title: `Urlop rodzicielski – ${role === "matka" ? "mama" : "tata"} (${parts.length > 1 ? `${parts.length} części` : "1 część"}${combined ? ", z pracą" : ""})`,
      who: role === "matka" ? "mama" : "tata",
      where: title === "umowa_o_prace" ? "pracodawca" : e?.payer === "platnik" ? "płatnik" : "ZUS",
      forms: title === "umowa_o_prace" ? ["Wniosek o urlop rodzicielski", ...(combined ? ["Wniosek o łączenie urlopu rodzicielskiego z pracą"] : [])] : ["ZAM"],
      attachments: role === "ojciec" ? ["Skrócony odpis aktu urodzenia dziecka (jeśli nie złożono wcześniej)"] : [],
      deadline: minus(firstStart, combined ? d.combineWorkApplicationDaysBefore : d.parentalApplicationDaysBefore),
      deadlineRule:
        `Wniosek o (każdą część) urlopu rodzicielskiego – najpóźniej ${d.parentalApplicationDaysBefore} dni przed jego rozpoczęciem` +
        (combined ? `; o łączenie z pracą – ${d.combineWorkApplicationDaysBefore} dni przed podjęciem pracy` : "") +
        (role === "matka" && plan?.longApplication ? ". Jeśli złożysz wniosek o cały urlop po porodzie, ten krok jest już załatwiony." : "."),
      online: title === "umowa_o_prace" ? { channel: "e-mail/system kadrowy", howTo: ["Złóż wniosek u pracodawcy."] } : { channel: "PUE/eZUS", howTo: PUE_HOWTO },
      links: [{ label: "Urlop rodzicielski (gov.pl)", url: LINKS.parentalGov }],
      source: `${combined ? SRC.kp1821e : SRC.kp1821b}; ${SRC.rozpWnioski}`,
    });
  }

  const fatherMaternity = schedule?.periods.find((p) => p.parent === "ojciec" && (p.type === "macierzynski" || p.type === "na_warunkach_macierzynskiego"));
  if (fatherMaternity && fTitle) {
    steps.push({
      id: "przejecie-macierzynskiego",
      title: "Mama rezygnuje z części macierzyńskiego, tata przejmuje resztę",
      who: "oboje",
      where: fTitle === "umowa_o_prace" ? "pracodawca" : f!.payer === "platnik" ? "płatnik" : "ZUS",
      forms: ["Wniosek mamy o rezygnację z pozostałej części urlopu macierzyńskiego", fTitle === "umowa_o_prace" ? "Wniosek taty o urlop macierzyński (pozostała część)" : "ZAM (tata)"],
      attachments: ["Skrócony odpis aktu urodzenia dziecka"],
      deadline: minus(fatherMaternity.from, d.maternityResignationDaysBefore),
      deadlineRule: `Po wykorzystaniu co najmniej 14 tygodni mama składa wniosek najpóźniej ${d.maternityResignationDaysBefore} dni przed powrotem do pracy; tata przejmuje urlop od następnego dnia.`,
      online: { channel: "e-mail/system kadrowy", howTo: ["Mama składa wniosek u swojego pracodawcy, tata – u swojego (lub ZAM w ZUS)."] },
      links: [{ label: "Prawa rodziców (PIP)", url: LINKS.pip }],
      source: SRC.kp180,
    });
  }

  // --- Paternity leave -----------------------------------------------------------------------------
  const paternity = schedule?.periods.find((p) => p.type === "ojcowski");
  if (fTitle && (paternity || (entitlement.paternityWeeks > 0 && !schedule))) {
    steps.push({
      id: "ojcowski",
      title: "Urlop ojcowski (2 tygodnie, 100%)",
      who: "tata",
      where: fTitle === "umowa_o_prace" ? "pracodawca" : f!.payer === "platnik" ? "płatnik" : "ZUS",
      forms: fTitle === "umowa_o_prace" ? ["Wniosek o urlop ojcowski"] : ["ZAM"],
      attachments: ["Skrócony odpis aktu urodzenia dziecka", ...(adoption ? ["Postanowienie sądu o przysposobieniu"] : [])],
      deadline: paternity ? minus(paternity.from, d.paternityApplicationDaysBefore) : undefined,
      deadlineRule: `Wniosek najpóźniej ${d.paternityApplicationDaysBefore} dni przed rozpoczęciem urlopu. Urlop trzeba wykorzystać do ${entitlement.paternityDeadline ?? "12. miesiąca życia dziecka"}.`,
      online: fTitle === "umowa_o_prace" ? { channel: "e-mail/system kadrowy", howTo: ["Złóż wniosek u pracodawcy."] } : { channel: "PUE/eZUS", howTo: PUE_HOWTO },
      links: [{ label: "Wzory formularzy (zus.pl)", url: LINKS.forms }],
      source: SRC.kp1823,
    });
  }

  // --- Adoption / foster care documents ------------------------------------------------------------
  if (adoption) {
    steps.push({
      id: "dokumenty-adopcja",
      title: scenario.kind === "adopcja" ? "Dokumenty z sądu (adopcja)" : "Dokumenty z sądu lub ośrodka (rodzina zastępcza)",
      who: "oboje",
      where: mTitle === "umowa_o_prace" ? "pracodawca" : "ZUS",
      forms: [],
      attachments:
        scenario.kind === "adopcja"
          ? ["Postanowienie sądu o przysposobieniu lub o wszczęciu postępowania", "Dokument potwierdzający datę przyjęcia dziecka"]
          : ["Postanowienie sądu lub umowa o umieszczeniu dziecka w rodzinie zastępczej", "Dokument potwierdzający datę przyjęcia dziecka"],
      deadlineRule: "Dołącz do pierwszego wniosku o urlop / zasiłek.",
      online: { channel: "PUE/eZUS", howTo: ["Dołącz skan postanowienia do wniosku składanego elektronicznie."] },
      links: [{ label: "Wzory formularzy (zus.pl)", url: LINKS.forms }],
      source: `${SRC.kp183}; ${SRC.rozpDokumenty}`,
    });
  }

  // --- Stillbirth / child death ---------------------------------------------------------------------
  if (scenario.kind === "urodzenie" && (scenario.stillbirth || scenario.childDeath)) {
    steps.push({
      id: "zgon-dziecka",
      title: scenario.stillbirth ? "Martwe urodzenie – dokumenty" : "Zgon dziecka – dokumenty",
      who: "mama",
      where: mTitle === "umowa_o_prace" ? "pracodawca" : "ZUS",
      forms: [],
      attachments: [scenario.stillbirth ? "Zaświadczenie o martwym urodzeniu / skrócony odpis aktu urodzenia z adnotacją" : "Skrócony odpis aktu zgonu dziecka"],
      deadlineRule: "Przekaż niezwłocznie – od tego zależy długość urlopu macierzyńskiego. Pomoc i wsparcie: sekcja „Trudne sytuacje”.",
      online: { channel: "PUE/eZUS", howTo: ["Dokument możesz dołączyć jako skan do wiadomości na PUE/eZUS."] },
      links: [],
      source: `${SRC.kp180}; ${SRC.rozpDokumenty}`,
    });
  }

  // --- Birth certificate ----------------------------------------------------------------------------
  if (!adoption) {
    const born = scenario.kind === "urodzenie";
    steps.push({
      id: "odpis-aktu-urodzenia",
      title: "Rejestracja urodzenia i skrócony odpis aktu urodzenia",
      who: "oboje",
      where: "USC/gov.pl",
      forms: ["Zgłoszenie urodzenia (USC lub online)", "Wniosek o odpis aktu urodzenia (gov.pl)"],
      attachments: [],
      deadline: born ? iso(addDays(parseISO(event), d.birthRegistrationDays)) : undefined,
      deadlineRule: `Urodzenie zgłasza się w ciągu ${d.birthRegistrationDays} dni. Odpis aktu urodzenia jest załącznikiem do wniosków o urlop i zasiłek.`,
      online: { channel: "gov.pl", howTo: ["Zgłoś urodzenie i zamów odpis aktu urodzenia online na gov.pl (profil zaufany).", "Odpis otrzymasz elektronicznie lub odbierzesz w USC."] },
      links: [{ label: "Odpis aktu urodzenia (gov.pl)", url: LINKS.birthCertificate }],
      source: SRC.asc,
    });
  }

  // Sort by deadline (undated steps keep their logical order after dated ones of the same block).
  return steps
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (a.s.deadline && b.s.deadline ? a.s.deadline.localeCompare(b.s.deadline) : a.i - b.i))
    .map(({ s }) => s);
}
