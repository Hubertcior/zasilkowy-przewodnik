import { addMonths, addWeeks, format, parseISO } from "date-fns";
import {
  applicantFields,
  birthDate,
  checkPeriods,
  childFields,
  employerOf,
  minusDays,
  nameFor,
  or,
  periodFields,
  periodsOf,
  pl,
  plusDays,
  spanOf,
  str,
} from "./helpers";
import type { FormContext, FormDef, FormValues } from "./types";

// Our own leave application templates. Each contains exactly the elements and attachments required by the
// regulation of the Minister of Family, Labour and Social Policy of 11 March 2025 (Dz.U. 2025 poz. 322).

const ROZP = "rozporządzenie MRPiPS z 11.03.2025 r. (Dz.U. 2025 poz. 322)";
const BIRTH_CERT = "Odpis skrócony aktu urodzenia dziecka (lub zagraniczny dokument potwierdzający urodzenie) albo jego kopia";
const iso = (d: Date) => format(d, "yyyy-MM-dd");

const header = (v: FormValues) => ({
  addressee: or(str(v, "employer")),
  intro: `${or(str(v, "name"))}\n${or(str(v, "place"))}, ${pl(v.date)}`,
});

const common = (ctx: FormContext, role: "matka" | "ojciec"): FormValues => ({
  name: nameFor(ctx, role),
  employer: employerOf(ctx, role),
  place: "",
  date: ctx.today,
});

// --- § 2: part of maternity leave before the expected birth date -----------------------------------
export const maternityBeforeBirth: FormDef = {
  id: "macierzynski-przed-porodem",
  title: "Wniosek o udzielenie części urlopu macierzyńskiego przed przewidywaną datą porodu",
  short: "Macierzyński przed porodem",
  description: "Do 6 tygodni urlopu macierzyńskiego możesz wykorzystać przed porodem.",
  applicant: "matka",
  recipient: "pracodawca",
  source: `§ 2 ${ROZP}; art. 180 § 2 Kodeksu pracy`,
  steps: [
    { title: "Twoje dane", fields: applicantFields("Imię i nazwisko pracownicy") },
    {
      title: "Termin",
      fields: [
        { name: "dueDate", label: "Przewidywana data porodu", type: "date", required: true },
        { name: "leaveFrom", label: "Data rozpoczęcia urlopu", type: "date", required: true, hint: "Najwcześniej 6 tygodni przed przewidywaną datą porodu" },
      ],
    },
  ],
  prefill: (ctx) => {
    const due = ctx.scenario.kind === "ciaza" ? ctx.scenario.dueDate : "";
    const from = due ? iso(addWeeks(parseISO(due), -ctx.deadlines.maternityStartWeeksBeforeDue)) : "";
    return { ...common(ctx, "matka"), dueDate: due, leaveFrom: from };
  },
  check: (v): Record<string, string> => {
    const due = str(v, "dueDate");
    const from = str(v, "leaveFrom");
    if (due && from && from < iso(addWeeks(parseISO(due), -6))) return { leaveFrom: "Przed porodem można wykorzystać najwyżej 6 tygodni urlopu" };
    if (due && from && from > due) return { leaveFrom: "Data rozpoczęcia musi przypadać przed przewidywaną datą porodu" };
    return {};
  },
  attachments: () => ["Kopia zaświadczenia lekarskiego (na zwykłym druku) określającego przewidywaną datę porodu"],
  render: (v) => ({
    title: "Wniosek o udzielenie części urlopu macierzyńskiego przed przewidywaną datą porodu",
    ...header(v),
    paragraphs: [
      `Na podstawie art. 180 § 2 Kodeksu pracy wnoszę o udzielenie mi części urlopu macierzyńskiego przed przewidywaną datą porodu, od dnia ${pl(v.leaveFrom)}.`,
      `Przewidywana data porodu: ${pl(v.dueDate)}.`,
    ],
  }),
  deadline: (v) =>
    str(v, "leaveFrom") ? { date: minusDays(str(v, "leaveFrom"), 1), rule: "Złóż wniosek przed dniem rozpoczęcia urlopu.", source: "art. 180 § 2 KP" } : undefined,
};

// --- § 15 (+ § 16): parental leave or its part, optionally combined with work ------------------------
const PART_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}. część` }));
const FRACTION_OPTIONS = [
  { value: "1/8", label: "1/8 etatu" },
  { value: "1/4", label: "1/4 etatu" },
  { value: "3/8", label: "3/8 etatu" },
  { value: "1/2", label: "1/2 etatu" },
];
const isFull = (v: FormValues) => v.mode === "pelny";
const combines = (v: FormValues) => v.combineWork === true;

export const parental: FormDef = {
  id: "rodzicielski",
  title: "Wniosek o udzielenie urlopu rodzicielskiego lub jego części",
  short: "Urlop rodzicielski",
  description:
    "W pełnym wymiarze bezpośrednio po urlopie macierzyńskim (do 21 dni po porodzie – zasiłek 81,5% za cały okres) albo w częściach (do 5), także z pracą do 1/2 etatu.",
  applicant: "rodzic",
  recipient: "pracodawca",
  source: `§ 15 i § 16 ${ROZP}; art. 182¹ᵈ i 182¹ᵉ Kodeksu pracy; art. 31 ust. 3 ustawy zasiłkowej`,
  steps: [
    { title: "Twoje dane", fields: applicantFields() },
    {
      title: "Okres urlopu",
      fields: [
        {
          name: "mode",
          label: "Rodzaj wniosku",
          type: "select",
          required: true,
          options: [
            { value: "pelny", label: "Cały urlop rodzicielski bezpośrednio po urlopie macierzyńskim (wariant 81,5%)" },
            { value: "czesc", label: "Część urlopu rodzicielskiego" },
          ],
        },
        ...periodFields("parental", "Urlop rodzicielski"),
        { name: "partNumber", label: "Która to część urlopu", type: "select", required: true, options: PART_OPTIONS, showIf: (v) => !isFull(v) },
        {
          name: "usedBefore",
          label: "Dotychczas wykorzystany urlop rodzicielski (okres) i liczba wykorzystanych części",
          type: "textarea",
          required: true,
          hint: "Np. „Nie korzystałam dotychczas z urlopu rodzicielskiego.”",
        },
        { name: "zaZyciem", label: "Dziecko ma zaświadczenie „Za życiem” (art. 4 ust. 3 ustawy „Za życiem”)", type: "checkbox" },
      ],
    },
    {
      title: "Drugi rodzic",
      fields: [
        {
          name: "otherParent",
          label: "Oświadczenie o drugim rodzicu dziecka",
          type: "select",
          required: true,
          options: [
            { value: "nie", label: "Drugi rodzic nie zamierza korzystać z urlopu rodzicielskiego w tym okresie" },
            { value: "tak", label: "Drugi rodzic zamierza korzystać z urlopu rodzicielskiego w części tego okresu" },
          ],
        },
        ...periodFields("otherParent", "Okres urlopu drugiego rodzica").map((f) => ({ ...f, showIf: (v: FormValues) => v.otherParent === "tak" })),
      ],
    },
    {
      title: "Łączenie z pracą",
      fields: [
        { name: "combineWork", label: "Chcę łączyć urlop rodzicielski z pracą u tego pracodawcy (do 1/2 etatu)", type: "checkbox" },
        { name: "workFraction", label: "Wymiar czasu pracy", type: "select", required: true, options: FRACTION_OPTIONS, showIf: combines },
        ...periodFields("combine", "Okres łączenia urlopu z pracą").map((f) => ({ ...f, showIf: combines })),
        {
          name: "extendedPart",
          label: "Część urlopu powstała z proporcjonalnego wydłużenia",
          type: "select",
          required: true,
          showIf: combines,
          options: [
            { value: "tak", label: "Zamierzam łączyć ją z pracą w tym samym wymiarze" },
            { value: "nie", label: "Nie zamierzam łączyć jej z pracą" },
          ],
        },
      ],
    },
  ],
  prefill: (ctx, role) => {
    const parts = periodsOf(ctx, "rodzicielski", role);
    const first = parts[0];
    const full = !!ctx.plan?.longApplication;
    const other = periodsOf(ctx, "rodzicielski", role === "matka" ? "ojciec" : "matka")[0];
    return {
      ...common(ctx, role),
      mode: full ? "pelny" : "czesc",
      parentalFrom: full ? (spanOf(ctx, "rodzicielski", role)?.from ?? "") : (first?.from ?? ""),
      parentalTo: full ? (spanOf(ctx, "rodzicielski", role)?.to ?? "") : (first?.to ?? ""),
      partNumber: "1",
      usedBefore: role === "matka" ? "Nie korzystałam dotychczas z urlopu rodzicielskiego." : "Nie korzystałem dotychczas z urlopu rodzicielskiego.",
      zaZyciem: ctx.scenario.kind === "urodzenie" && ctx.scenario.zaZyciem,
      otherParent: other ? "tak" : "nie",
      otherParentFrom: other?.from ?? "",
      otherParentTo: other?.to ?? "",
      combineWork: !!first?.workFraction,
      workFraction: first?.workFraction === 0.25 ? "1/4" : first?.workFraction === 0.5 ? "1/2" : "",
      combineFrom: first?.workFraction ? first.from : "",
      combineTo: first?.workFraction ? first.to : "",
      extendedPart: first?.workFraction ? "tak" : "",
    };
  },
  check: (v): Record<string, string> => {
    const e = checkPeriods(v, "parental", "otherParent", "combine");
    if (combines(v) && str(v, "combineFrom") && str(v, "parentalFrom") && (str(v, "combineFrom") < str(v, "parentalFrom") || str(v, "combineTo") > str(v, "parentalTo")))
      e.combineFrom = "Okres łączenia z pracą musi mieścić się w okresie urlopu";
    return e;
  },
  attachments: (v) => [
    BIRTH_CERT,
    "Oświadczenie o braku zamiaru korzystania z urlopu rodzicielskiego przez drugiego rodzica w okresie objętym wnioskiem albo o okresie, w którym zamierza z niego korzystać",
    ...(v.zaZyciem === true ? ["Kopia zaświadczenia, o którym mowa w art. 4 ust. 3 ustawy „Za życiem”"] : []),
  ],
  render: (v) => {
    const p: string[] = [];
    if (isFull(v)) {
      p.push(
        `Na podstawie art. 182¹ᵈ Kodeksu pracy wnoszę o udzielenie mi urlopu rodzicielskiego w pełnym wymiarze, bezpośrednio po urlopie macierzyńskim, w okresie od ${pl(v.parentalFrom)} do ${pl(v.parentalTo)}.`,
      );
    } else {
      p.push(
        `Na podstawie art. 182¹ᵈ Kodeksu pracy wnoszę o udzielenie mi ${str(v, "partNumber") || "…"}. części urlopu rodzicielskiego w okresie od ${pl(v.parentalFrom)} do ${pl(v.parentalTo)}.`,
      );
    }
    p.push(`Dotychczas wykorzystany urlop rodzicielski: ${or(str(v, "usedBefore"))}`);
    if (v.zaZyciem === true) p.push("Wniosek dotyczy urlopu rodzicielskiego w wymiarze przewidzianym w art. 182¹ᵃ § 2 Kodeksu pracy (dziecko z zaświadczeniem „Za życiem”).");
    p.push(
      v.otherParent === "tak"
        ? `Oświadczam, że drugi rodzic dziecka zamierza korzystać z urlopu rodzicielskiego w okresie od ${pl(v.otherParentFrom)} do ${pl(v.otherParentTo)}.`
        : "Oświadczam, że drugi rodzic dziecka nie zamierza korzystać z urlopu rodzicielskiego w okresie objętym wnioskiem.",
    );
    if (combines(v)) {
      p.push(
        `Na podstawie art. 182¹ᵉ § 2 Kodeksu pracy wnoszę o umożliwienie mi łączenia korzystania z urlopu rodzicielskiego z wykonywaniem pracy w wymiarze ${or(str(v, "workFraction"))} etatu w okresie od ${pl(v.combineFrom)} do ${pl(v.combineTo)}.`,
        v.extendedPart === "tak"
          ? `Oświadczam, że zamierzam łączyć część urlopu rodzicielskiego powstałą w wyniku proporcjonalnego wydłużenia tego urlopu z pracą w wymiarze ${or(str(v, "workFraction"))} etatu.`
          : "Oświadczam, że nie zamierzam łączyć części urlopu rodzicielskiego powstałej w wyniku proporcjonalnego wydłużenia tego urlopu z pracą.",
      );
    }
    return { title: "Wniosek o udzielenie urlopu rodzicielskiego", ...header(v), paragraphs: p };
  },
  deadline: (v, ctx) => {
    if (isFull(v)) {
      const b = birthDate(ctx);
      return b
        ? {
            date: plusDays(b, ctx.deadlines.longApplicationDaysAfterBirth),
            rule: `Wniosek o cały urlop bezpośrednio po macierzyńskim złóż najpóźniej ${ctx.deadlines.longApplicationDaysAfterBirth} dni po porodzie – inaczej zasiłek za macierzyński wyniesie 100%, a za rodzicielski 70% zamiast 81,5% za cały okres.`,
            source: "art. 182¹ᵈ KP; art. 31 ust. 3 ustawy zasiłkowej",
          }
        : undefined;
    }
    const from = combines(v) && str(v, "combineFrom") && str(v, "combineFrom") < str(v, "parentalFrom") ? str(v, "combineFrom") : str(v, "parentalFrom");
    return from
      ? {
          date: minusDays(from, ctx.deadlines.parentalApplicationDaysBefore),
          rule: `Wniosek o część urlopu rodzicielskiego (i o łączenie go z pracą) składa się co najmniej ${ctx.deadlines.parentalApplicationDaysBefore} dni przed jego rozpoczęciem.`,
          source: "art. 182¹ᵈ § 1 i art. 182¹ᵉ § 2 KP",
        }
      : undefined;
  },
};

// --- § 17: paternity leave ----------------------------------------------------------------------------
export const paternity: FormDef = {
  id: "ojcowski",
  title: "Wniosek o udzielenie urlopu ojcowskiego lub jego części",
  short: "Urlop ojcowski",
  description: "2 tygodnie (jednorazowo albo w 2 częściach po co najmniej tygodniu) do ukończenia przez dziecko 12 miesięcy.",
  applicant: "ojciec",
  recipient: "pracodawca",
  source: `§ 17 ${ROZP}; art. 182³ Kodeksu pracy`,
  steps: [
    { title: "Twoje dane", fields: applicantFields() },
    {
      title: "Okres urlopu",
      fields: [
        { name: "childBirthDate", label: "Data urodzenia dziecka", type: "date", required: true },
        ...periodFields("paternity", "Urlop ojcowski"),
        {
          name: "partNumber",
          label: "Zakres",
          type: "select",
          required: true,
          options: [
            { value: "calosc", label: "Cały urlop ojcowski" },
            { value: "1", label: "1. część" },
            { value: "2", label: "2. część" },
          ],
        },
        {
          name: "usedBefore",
          label: "Czy korzystałeś już z urlopu ojcowskiego lub jego części?",
          type: "select",
          required: true,
          options: [
            { value: "nie", label: "Nie korzystałem" },
            { value: "tak", label: "Tak, korzystałem z części" },
          ],
        },
        { name: "adopted", label: "Wniosek dotyczy dziecka przysposobionego", type: "checkbox" },
      ],
    },
  ],
  prefill: (ctx) => {
    const p = periodsOf(ctx, "ojcowski", "ojciec")[0];
    return {
      ...common(ctx, "ojciec"),
      childBirthDate: birthDate(ctx),
      paternityFrom: p?.from ?? "",
      paternityTo: p?.to ?? "",
      partNumber: "calosc",
      usedBefore: "nie",
      adopted: ctx.scenario.kind === "adopcja",
    };
  },
  check: (v): Record<string, string> => {
    const e = checkPeriods(v, "paternity");
    const b = str(v, "childBirthDate");
    if (!v.adopted && b && str(v, "paternityTo") && str(v, "paternityTo") >= iso(addMonths(parseISO(b), 12)))
      e.paternityTo = "Urlop ojcowski przysługuje do ukończenia przez dziecko 12 miesięcy";
    const from = str(v, "paternityFrom");
    const to = str(v, "paternityTo");
    if (from && to && to >= from) {
      const days = (parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000 + 1;
      if (days > 14) e.paternityTo = "Urlop ojcowski trwa najwyżej 2 tygodnie (14 dni)";
      else if (v.partNumber !== "calosc" && days < 7) e.paternityTo = "Część urlopu ojcowskiego nie może być krótsza niż tydzień";
    }
    return e;
  },
  attachments: (v) => [
    BIRTH_CERT,
    ...(v.adopted === true ? ["Kopia prawomocnego postanowienia sądu o przysposobieniu dziecka"] : []),
    "Oświadczenie pracownika – ojca, czy korzystał z urlopu ojcowskiego albo jego części",
  ],
  render: (v) => ({
    title: "Wniosek o udzielenie urlopu ojcowskiego",
    ...header(v),
    paragraphs: [
      `Na podstawie art. 182³ Kodeksu pracy wnoszę o udzielenie mi ${v.partNumber === "calosc" ? "urlopu ojcowskiego" : `${v.partNumber}. części urlopu ojcowskiego`} w okresie od ${pl(v.paternityFrom)} do ${pl(v.paternityTo)}${v.adopted === true ? " w związku z przysposobieniem dziecka" : ` w związku z urodzeniem dziecka w dniu ${pl(v.childBirthDate)}`}.`,
      v.usedBefore === "tak" ? "Oświadczam, że korzystałem już z części urlopu ojcowskiego." : "Oświadczam, że nie korzystałem dotychczas z urlopu ojcowskiego.",
    ],
  }),
  deadline: (v, ctx) =>
    str(v, "paternityFrom")
      ? {
          date: minusDays(str(v, "paternityFrom"), ctx.deadlines.paternityApplicationDaysBefore),
          rule: `Wniosek o urlop ojcowski składa się co najmniej ${ctx.deadlines.paternityApplicationDaysBefore} dni przed jego rozpoczęciem.`,
          source: "art. 182³ § 2 KP",
        }
      : undefined,
};

// --- § 14: supplementary maternity leave -------------------------------------------------------------
export const supplementary: FormDef = {
  id: "uzupelniajacy",
  title: "Wniosek o udzielenie uzupełniającego urlopu macierzyńskiego",
  short: "Uzupełniający urlop macierzyński",
  description: "Dla rodziców wcześniaków i dzieci, które po porodzie przebywały w szpitalu. Przypada bezpośrednio po urlopie macierzyńskim.",
  applicant: "rodzic",
  recipient: "pracodawca",
  source: `§ 14 ${ROZP}; art. 180² Kodeksu pracy`,
  steps: [
    { title: "Twoje dane", fields: applicantFields() },
    {
      title: "Okres urlopu",
      fields: [
        { name: "maternityEnd", label: "Termin zakończenia urlopu macierzyńskiego", type: "date", required: true },
        ...periodFields("supplementary", "Uzupełniający urlop macierzyński"),
        {
          name: "otherParentDecl",
          label: "Oświadczam, że drugi z rodziców nie zamierza korzystać z uzupełniającego urlopu macierzyńskiego (ani z zasiłku za ten okres)",
          type: "checkbox",
          required: true,
        },
      ],
    },
  ],
  prefill: (ctx, role) => {
    const mat = spanOf(ctx, "macierzynski");
    const sup = periodsOf(ctx, "uzupelniajacy", role)[0];
    return {
      ...common(ctx, role),
      maternityEnd: mat?.to ?? "",
      supplementaryFrom: sup?.from ?? (mat ? plusDays(mat.to, 1) : ""),
      supplementaryTo: sup?.to ?? "",
      otherParentDecl: false,
    };
  },
  check: (v): Record<string, string> => {
    const e = checkPeriods(v, "supplementary");
    if (str(v, "maternityEnd") && str(v, "supplementaryFrom") && str(v, "supplementaryFrom") !== plusDays(str(v, "maternityEnd"), 1))
      e.supplementaryFrom = "Uzupełniający urlop macierzyński musi zaczynać się w dniu po zakończeniu urlopu macierzyńskiego";
    return e;
  },
  attachments: () => [
    "Zaświadczenie, o którym mowa w art. 180² § 5 Kodeksu pracy (o urodzeniu przed 37. tygodniem ciąży / masie urodzeniowej / pobycie dziecka w szpitalu)",
    "Oświadczenie o braku zamiaru korzystania z uzupełniającego urlopu macierzyńskiego przez drugiego z rodziców",
  ],
  render: (v) => ({
    title: "Wniosek o udzielenie uzupełniającego urlopu macierzyńskiego",
    ...header(v),
    paragraphs: [
      `Na podstawie art. 180² § 4 Kodeksu pracy wnoszę o udzielenie mi uzupełniającego urlopu macierzyńskiego w okresie od ${pl(v.supplementaryFrom)} do ${pl(v.supplementaryTo)}.`,
      `Urlop macierzyński kończy się w dniu ${pl(v.maternityEnd)}.`,
      "Oświadczam, że drugi z rodziców dziecka nie zamierza korzystać z uzupełniającego urlopu macierzyńskiego ani z zasiłku macierzyńskiego za okres odpowiadający okresowi tego urlopu.",
    ],
  }),
  deadline: (v, ctx) =>
    str(v, "maternityEnd")
      ? {
          date: minusDays(str(v, "maternityEnd"), ctx.deadlines.supplementaryApplicationDaysBeforeMaternityEnd),
          rule: `Wniosek składa się co najmniej ${ctx.deadlines.supplementaryApplicationDaysBeforeMaternityEnd} dni przed zakończeniem urlopu macierzyńskiego.`,
          source: "art. 180² § 4 KP",
        }
      : undefined,
};

// --- § 3/§ 4: mother resigns from the rest of maternity leave ------------------------------------------
export const maternityResignation: FormDef = {
  id: "rezygnacja-macierzynskiego",
  title: "Wniosek w sprawie rezygnacji z pozostałej części urlopu macierzyńskiego",
  short: "Rezygnacja z części macierzyńskiego",
  description: "Po wykorzystaniu co najmniej 14 tygodni po porodzie mama może wrócić do pracy, a resztę urlopu przejmuje tata.",
  applicant: "matka",
  recipient: "pracodawca",
  source: `§ 3 i § 4 ${ROZP}; art. 180 § 8 Kodeksu pracy`,
  steps: [
    { title: "Twoje dane", fields: applicantFields("Imię i nazwisko pracownicy") },
    {
      title: "Powrót do pracy",
      fields: [
        { name: "childBirthDate", label: "Data porodu", type: "date", required: true },
        { name: "returnDate", label: "Termin powrotu do pracy", type: "date", required: true },
        {
          name: "variant",
          label: "Podstawa",
          type: "select",
          required: true,
          options: [
            { value: "14", label: "Wykorzystałam co najmniej 14 tygodni urlopu po porodzie" },
            { value: "8", label: "Mam orzeczenie o niezdolności do samodzielnej egzystencji (co najmniej 8 tygodni po porodzie)" },
          ],
        },
      ],
    },
  ],
  prefill: (ctx) => {
    const father = periodsOf(ctx, "macierzynski", "ojciec")[0];
    return { ...common(ctx, "matka"), childBirthDate: birthDate(ctx), returnDate: father?.from ?? "", variant: "14" };
  },
  check: (v): Record<string, string> => {
    const b = str(v, "childBirthDate");
    const r = str(v, "returnDate");
    const weeks = v.variant === "8" ? 8 : 14;
    if (b && r && r < iso(addWeeks(parseISO(b), weeks))) return { returnDate: `Powrót możliwy po wykorzystaniu co najmniej ${weeks} tygodni urlopu po porodzie` };
    return {};
  },
  attachments: (v) => [
    "Kopia wniosku ojca dziecka o udzielenie pozostałej części urlopu macierzyńskiego (albo kopia jego oświadczenia o przerwaniu działalności zarobkowej)",
    ...(v.variant === "8" ? ["Kopia prawomocnego orzeczenia o niezdolności do samodzielnej egzystencji"] : []),
  ],
  render: (v) => ({
    title: "Wniosek w sprawie rezygnacji z pozostałej części urlopu macierzyńskiego",
    ...header(v),
    paragraphs: [
      `Na podstawie art. 180 § 8 Kodeksu pracy rezygnuję z pozostałej części urlopu macierzyńskiego i wnoszę o umożliwienie mi powrotu do pracy od dnia ${pl(v.returnDate)}.`,
      v.variant === "8"
        ? "Wykorzystałam po porodzie co najmniej 8 tygodni urlopu macierzyńskiego i legitymuję się orzeczeniem o niezdolności do samodzielnej egzystencji."
        : "Wykorzystałam po porodzie co najmniej 14 tygodni urlopu macierzyńskiego.",
      "Pozostałą część urlopu macierzyńskiego wykorzysta ojciec dziecka.",
    ],
  }),
  deadline: (v, ctx) =>
    str(v, "returnDate")
      ? {
          date: minusDays(str(v, "returnDate"), ctx.deadlines.maternityResignationDaysBefore),
          rule: `Wniosek składa się co najmniej ${ctx.deadlines.maternityResignationDaysBefore} dni przed przystąpieniem do pracy.`,
          source: "art. 180 § 8 KP",
        }
      : undefined,
};

// --- § 5: father takes over the rest of maternity leave ------------------------------------------------
export const maternityTakeOver: FormDef = {
  id: "przejecie-macierzynskiego",
  title: "Wniosek ojca o udzielenie pozostałej części urlopu macierzyńskiego",
  short: "Przejęcie macierzyńskiego przez tatę",
  description: "Tata przejmuje resztę urlopu macierzyńskiego, gdy mama rezygnuje z niego po 14 tygodniach.",
  applicant: "ojciec",
  recipient: "pracodawca",
  source: `§ 5 ${ROZP}; art. 180 § 9 Kodeksu pracy`,
  steps: [
    { title: "Twoje dane", fields: applicantFields("Imię i nazwisko pracownika – ojca dziecka") },
    { title: "Dziecko", fields: childFields },
    {
      title: "Okres urlopu",
      fields: [
        {
          name: "beforeBirth",
          label: "Oświadczenie o urlopie macierzyńskim (zasiłku) wykorzystanym przez matkę przed porodem",
          type: "textarea",
          required: true,
        },
        ...periodFields("takeOver", "Pozostała część urlopu macierzyńskiego"),
      ],
    },
  ],
  prefill: (ctx) => {
    const p = spanOf(ctx, "macierzynski", "ojciec");
    return {
      ...common(ctx, "ojciec"),
      childName: "",
      childBirthDate: birthDate(ctx),
      beforeBirth: "Matka dziecka nie korzystała z urlopu macierzyńskiego przed porodem.",
      takeOverFrom: p?.from ?? "",
      takeOverTo: p?.to ?? "",
    };
  },
  check: (v) => checkPeriods(v, "takeOver"),
  attachments: () => [BIRTH_CERT, "Oświadczenie matki dziecka o zamiarze rezygnacji z pozostałej części urlopu macierzyńskiego (albo z pobierania zasiłku)"],
  render: (v) => ({
    title: "Wniosek o udzielenie pozostałej części urlopu macierzyńskiego",
    ...header(v),
    paragraphs: [
      `Na podstawie art. 180 § 9 Kodeksu pracy wnoszę o udzielenie mi pozostałej części urlopu macierzyńskiego w okresie od ${pl(v.takeOverFrom)} do ${pl(v.takeOverTo)} w związku z rezygnacją matki dziecka z tej części urlopu.`,
      `Dziecko: ${or(str(v, "childName"))}, urodzone ${pl(v.childBirthDate)}.`,
      `Oświadczenie o okresie urlopu macierzyńskiego wykorzystanego przed porodem: ${or(str(v, "beforeBirth"))}`,
    ],
  }),
  deadline: (v, ctx) =>
    str(v, "takeOverFrom")
      ? {
          date: minusDays(str(v, "takeOverFrom"), ctx.deadlines.maternityResignationDaysBefore),
          rule: `Złóż wniosek razem z wnioskiem mamy o rezygnację – co najmniej ${ctx.deadlines.maternityResignationDaysBefore} dni przed przejęciem urlopu.`,
          source: "art. 180 § 8–9 KP",
        }
      : undefined,
};

// --- § 18: leave on maternity terms (adoption / foster care) ------------------------------------------
export const adoptionLeave: FormDef = {
  id: "na-warunkach-macierzynskiego",
  title: "Wniosek o udzielenie urlopu na warunkach urlopu macierzyńskiego",
  short: "Urlop na warunkach macierzyńskiego",
  description: "Przy przyjęciu dziecka na wychowanie (przysposobienie) albo jako rodzina zastępcza (z wyjątkiem zawodowej).",
  applicant: "rodzic",
  recipient: "pracodawca",
  source: `§ 18 ${ROZP}; art. 183 Kodeksu pracy`,
  steps: [
    { title: "Twoje dane", fields: applicantFields() },
    {
      title: "Dziecko",
      fields: [
        ...childFields,
        { name: "acceptDate", label: "Data przyjęcia dziecka na wychowanie", type: "date", required: true },
        {
          name: "kind",
          label: "Podstawa",
          type: "select",
          required: true,
          options: [
            { value: "adopcja", label: "Przyjęcie na wychowanie i wniosek do sądu o przysposobienie" },
            { value: "piecza", label: "Rodzina zastępcza (z wyjątkiem zawodowej)" },
          ],
        },
        { name: "postponedSchool", label: "Wobec dziecka podjęto decyzję o odroczeniu obowiązku szkolnego", type: "checkbox" },
      ],
    },
    { title: "Okres urlopu", fields: periodFields("leave", "Urlop na warunkach urlopu macierzyńskiego") },
  ],
  prefill: (ctx, role) => {
    const s = ctx.scenario;
    const p = spanOf(ctx, "na_warunkach_macierzynskiego", role);
    return {
      ...common(ctx, role),
      childName: "",
      childBirthDate: "",
      acceptDate: s.kind === "adopcja" || s.kind === "piecza" ? s.acceptDate : "",
      kind: s.kind === "piecza" ? "piecza" : "adopcja",
      postponedSchool: (s.kind === "adopcja" || s.kind === "piecza") && !!s.postponedSchool,
      leaveFrom: p?.from ?? "",
      leaveTo: p?.to ?? "",
    };
  },
  check: (v) => checkPeriods(v, "leave"),
  attachments: (v) => [
    v.kind === "piecza"
      ? "Oświadczenie o dacie przyjęcia dziecka oraz kopia prawomocnego orzeczenia sądu o umieszczeniu dziecka w rodzinie zastępczej (albo kopia umowy rodziny zastępczej ze starostą)"
      : "Oświadczenie o dacie przyjęcia dziecka oraz kopia wniosku o wszczęcie postępowania o przysposobienie z poświadczeniem sądu (albo zaświadczenie sądu o dacie wystąpienia)",
    ...(v.postponedSchool === true ? ["Kopia prawomocnej decyzji o odroczeniu obowiązku szkolnego"] : []),
  ],
  render: (v) => ({
    title: "Wniosek o udzielenie urlopu na warunkach urlopu macierzyńskiego",
    ...header(v),
    paragraphs: [
      `Na podstawie art. 183 Kodeksu pracy wnoszę o udzielenie mi urlopu na warunkach urlopu macierzyńskiego w okresie od ${pl(v.leaveFrom)} do ${pl(v.leaveTo)}.`,
      `Dziecko: ${or(str(v, "childName"))}, urodzone ${pl(v.childBirthDate)}, przyjęte na wychowanie ${v.kind === "piecza" ? "jako rodzina zastępcza" : "(wystąpiłam/wystąpiłem do sądu opiekuńczego o przysposobienie)"} w dniu ${pl(v.acceptDate)}.`,
    ],
  }),
};

export const LEAVE_FORMS = [maternityBeforeBirth, parental, paternity, supplementary, maternityResignation, maternityTakeOver, adoptionLeave];
