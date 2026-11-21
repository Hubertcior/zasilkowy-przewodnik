import { z } from "zod";
import type { CaseFile, InsurancePeriod, ParentData, Scenario } from "@/engine/types";

// AI reading of uploaded PDFs (KAN-36). This module is shared by the server (schema sent to the model, validation)
// and the client (verification form, conversion to a CaseFile). It never calls the model itself.

export const CONFIDENCE = ["wysoka", "srednia", "niska"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

const conf = z.enum(CONFIDENCE);
/** Every extracted value carries the model's confidence and the quote it was read from (or null when absent). */
const field = <T extends z.ZodType>(t: T) => z.object({ value: t.nullable(), confidence: conf, sourceQuote: z.string().nullable() });

export const ExtractionSchema = z.object({
  documents: z.array(
    z.object({
      kind: z.enum(["ZAM", "Z-3", "Z-3a", "zaswiadczenie_lekarskie", "akt_urodzenia", "inne"]),
      description: z.string(),
    }),
  ),
  applicantRole: field(z.enum(["matka", "ojciec"])),
  applicantName: field(z.string()),
  insuranceTitle: field(z.enum(["umowa_o_prace", "zlecenie", "dzialalnosc", "inne"])),
  sickness: field(z.enum(["obowiazkowe", "dobrowolne", "brak"])),
  insuredFrom: field(z.string()),
  payerName: field(z.string()),
  payerInsuredCount: field(z.number().int()),
  incomes: z.array(z.object({ month: z.string(), gross: z.number(), confidence: conf, sourceQuote: z.string().nullable() })),
  declaredBase: field(z.number()),
  scenario: field(z.enum(["ciaza", "urodzenie", "adopcja", "piecza"])),
  eventDate: field(z.string()),
  children: field(z.number().int()),
  zaZyciem: field(z.boolean()),
  longApplication: field(z.boolean()),
  gestationWeek: field(z.number().int()),
  birthWeightG: field(z.number().int()),
  hospitalWeeks: field(z.number()),
  notes: z.array(z.string()),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type ScalarKey = Exclude<keyof Extraction, "documents" | "incomes" | "notes">;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

/**
 * Validates a raw model response and normalises it: malformed dates become null with low confidence, impossible
 * numbers are dropped, income months are de-duplicated and sorted. Returns zod issues when the shape is wrong.
 */
export function parseExtraction(raw: unknown): { ok: true; data: Extraction } | { ok: false; error: string } {
  const r = ExtractionSchema.safeParse(raw);
  if (!r.success) return { ok: false, error: r.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const d = structuredClone(r.data);
  const drop = (k: ScalarKey) => {
    d[k] = { value: null, confidence: "niska", sourceQuote: d[k].sourceQuote } as never;
  };
  for (const k of ["insuredFrom", "eventDate"] as const) if (d[k].value !== null && !ISO_DATE.test(d[k].value)) drop(k);
  for (const k of ["payerInsuredCount", "declaredBase", "children", "gestationWeek", "birthWeightG", "hospitalWeeks"] as const) {
    const v = d[k].value;
    if (v !== null && (!Number.isFinite(v) || v < 0)) drop(k);
  }
  if (d.children.value !== null && (d.children.value < 1 || d.children.value > 10)) drop("children");
  const seen = new Map<string, Extraction["incomes"][number]>();
  for (const i of d.incomes) if (ISO_MONTH.test(i.month) && i.gross >= 0) seen.set(i.month, i);
  d.incomes = [...seen.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  return { ok: true, data: d };
}

/** Editable values of the verification form (what the user confirms). */
export interface ExtractionForm {
  applicantRole: "matka" | "ojciec";
  applicantName: string;
  insuranceTitle: InsurancePeriod["title"];
  sickness: InsurancePeriod["sickness"];
  insuredFrom: string;
  payerName: string;
  payerInsuredCount: string;
  incomes: { month: string; gross: string }[];
  declaredBase: string;
  scenario: Scenario["kind"];
  eventDate: string;
  children: string;
  zaZyciem: boolean;
  longApplication: boolean;
  gestationWeek: string;
  birthWeightG: string;
  hospitalWeeks: string;
}

const s = (v: string | number | null) => (v === null ? "" : String(v));

export function extractionToForm(e: Extraction): ExtractionForm {
  return {
    applicantRole: e.applicantRole.value ?? "matka",
    applicantName: e.applicantName.value ?? "",
    insuranceTitle: e.insuranceTitle.value ?? "umowa_o_prace",
    sickness: e.sickness.value ?? (e.insuranceTitle.value === "umowa_o_prace" || e.insuranceTitle.value === null ? "obowiazkowe" : "dobrowolne"),
    insuredFrom: e.insuredFrom.value ?? "",
    payerName: e.payerName.value ?? "",
    payerInsuredCount: s(e.payerInsuredCount.value),
    incomes: e.incomes.map((i) => ({ month: i.month, gross: String(i.gross) })),
    declaredBase: s(e.declaredBase.value),
    scenario: e.scenario.value ?? "urodzenie",
    eventDate: e.eventDate.value ?? "",
    children: s(e.children.value ?? 1),
    zaZyciem: e.zaZyciem.value ?? false,
    longApplication: e.longApplication.value ?? false,
    gestationWeek: s(e.gestationWeek.value),
    birthWeightG: s(e.birthWeightG.value),
    hospitalWeeks: s(e.hospitalWeeks.value),
  };
}

const num = (v: string) => {
  const n = Number(v.replace(",", ".").replace(/\s/g, ""));
  return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
};

/** Checks the confirmed form; returns field → message. */
export function validateExtractionForm(f: ExtractionForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!ISO_DATE.test(f.insuredFrom)) e.insuredFrom = "Podaj datę początku ubezpieczenia";
  if (!ISO_DATE.test(f.eventDate)) e.eventDate = "Podaj datę porodu / przyjęcia dziecka";
  const children = num(f.children);
  if (!children || children < 1 || children > 10 || !Number.isInteger(children)) e.children = "Liczba dzieci 1–10";
  if (f.insuranceTitle === "dzialalnosc" && f.sickness !== "brak" && num(f.declaredBase) === undefined) e.declaredBase = "Podaj zadeklarowaną podstawę składek";
  if (f.insuranceTitle !== "dzialalnosc" && f.incomes.filter((i) => num(i.gross) !== undefined).length === 0) e.incomes = "Podaj co najmniej jeden miesiąc wynagrodzenia (z Z-3 / Z-3a)";
  if (f.incomes.some((i) => !ISO_MONTH.test(i.month) || num(i.gross) === undefined)) e.incomes = "Miesiąc w formacie RRRR-MM i kwota brutto";
  if (f.scenario === "urodzenie" && (num(f.gestationWeek) !== undefined) !== (num(f.birthWeightG) !== undefined)) e.birthWeightG = "Podaj tydzień ciąży i masę urodzeniową albo żadne z nich";
  return e;
}

/** Builds a CaseFile (one parent) from the confirmed form. Source of all values: the user-confirmed document data. */
export function formToCase(f: ExtractionForm): CaseFile {
  const count = num(f.payerInsuredCount);
  const period: InsurancePeriod = {
    title: f.insuranceTitle,
    sickness: f.insuranceTitle === "umowa_o_prace" ? "obowiazkowe" : f.sickness,
    from: f.insuredFrom,
    ...(f.payerName.trim() ? { payerName: f.payerName.trim() } : {}),
    ...(count !== undefined ? { payerInsuredCount: Math.round(count) } : {}),
  };
  const incomes = f.incomes.map((i) => ({ month: i.month, gross: num(i.gross) ?? 0 }));
  const declared = num(f.declaredBase);
  const parent: ParentData = {
    role: f.applicantRole,
    periods: [period],
    incomes: f.insuranceTitle === "dzialalnosc" ? [] : incomes,
    ...(f.insuranceTitle === "dzialalnosc" && declared !== undefined
      ? { declaredBase: lastMonths(f.eventDate, 12).map((month) => ({ month, amount: declared })) }
      : {}),
  };
  const children = num(f.children) ?? 1;
  const gw = num(f.gestationWeek);
  const bw = num(f.birthWeightG);
  const hw = num(f.hospitalWeeks);
  let scenario: Scenario;
  if (f.scenario === "ciaza") scenario = { kind: "ciaza", dueDate: f.eventDate };
  else if (f.scenario === "urodzenie")
    scenario = {
      kind: "urodzenie",
      birthDate: f.eventDate,
      children,
      zaZyciem: f.zaZyciem,
      ...(gw !== undefined && bw !== undefined ? { prematurity: { gestationWeek: gw, birthWeightG: bw, hospitalWeeks: hw ?? 0 } } : {}),
    };
  else scenario = { kind: f.scenario, acceptDate: f.eventDate, children, childAges: Array.from({ length: children }, () => 1) };
  return {
    id: "odczyt-pdf",
    title: f.applicantName.trim() ? `Sprawa z PDF – ${f.applicantName.trim()}` : "Sprawa odczytana z PDF",
    // The leave plan is not read from documents: the engine's default plan applies and can be changed in the calculator.
    description:
      "Dane odczytane z wgranych dokumentów przez AI i zatwierdzone przez użytkownika." +
      (f.longApplication ? " We wniosku ZAM zaznaczono pełny wymiar urlopów (81,5%)." : " Wariant 81,5% nie został zaznaczony we wniosku – sprawdź plan w kalkulatorze."),
    synthetic: false,
    parents: [parent],
    scenario,
  };
}

/** The 12 full months before the month of `date` (YYYY-MM), oldest first. */
function lastMonths(date: string, n: number): string[] {
  const [y, m] = date.split("-").map(Number);
  if (!y || !m) return [];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** Fields with low confidence (or missing), to highlight in the verification form. */
export function uncertainFields(e: Extraction): ScalarKey[] {
  return (Object.keys(e) as (keyof Extraction)[])
    .filter((k): k is ScalarKey => k !== "documents" && k !== "incomes" && k !== "notes")
    .filter((k) => e[k].confidence === "niska");
}
