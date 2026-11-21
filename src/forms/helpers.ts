import { addDays, format, parseISO, subDays } from "date-fns";
import type { BenefitPeriod, PeriodType } from "@/engine/types";
import type { FieldDef, FormContext, FormValues } from "./types";

export const iso = (d: Date) => format(d, "yyyy-MM-dd");
export const plusDays = (date: string, n: number) => iso(addDays(parseISO(date), n));
export const minusDays = (date: string, n: number) => iso(subDays(parseISO(date), n));

/** dd.mm.yyyy for application texts. */
export function pl(date: unknown): string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "……………";
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

export const str = (v: FormValues, k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "");
export const or = (s: string, fallback = "……………") => s || fallback;

/** Applicant's name for the role: the logged-in person's name when it fits (persona = mother), else empty. */
export function nameFor(ctx: FormContext, role: "matka" | "ojciec"): string {
  const n = ctx.person?.name;
  if (!n || / i /.test(n)) return "";
  return role === "matka" ? n : "";
}

export function peselFor(ctx: FormContext, role: "matka" | "ojciec"): string {
  return role === "matka" ? (ctx.person?.pesel ?? "") : "";
}

export function eventDate(ctx: FormContext): string {
  const s = ctx.scenario;
  return s.kind === "ciaza" ? s.dueDate : s.kind === "urodzenie" ? s.birthDate : s.acceptDate;
}

export function birthDate(ctx: FormContext): string {
  const s = ctx.scenario;
  return s.kind === "urodzenie" ? s.birthDate : s.kind === "ciaza" ? s.dueDate : "";
}

export function periodsOf(ctx: FormContext, type: PeriodType, role?: "matka" | "ojciec"): BenefitPeriod[] {
  return ctx.periods.filter((p) => p.type === type && (!role || p.parent === role));
}

/** Merged date range of all periods of a type (first from → last to). */
export function spanOf(ctx: FormContext, type: PeriodType, role?: "matka" | "ojciec"): { from: string; to: string } | undefined {
  const ps = periodsOf(ctx, type, role);
  if (!ps.length) return undefined;
  return { from: ps[0].from, to: ps[ps.length - 1].to };
}

export function employerOf(ctx: FormContext, role: "matka" | "ojciec"): string {
  const p = ctx.parents.find((x) => x.role === role);
  return p?.periods.find((x) => x.title === "umowa_o_prace" && !x.to)?.payerName ?? p?.periods[0]?.payerName ?? "";
}

// --- common fields ---------------------------------------------------------------------------------

export const applicantFields = (label = "Imię i nazwisko pracownika"): FieldDef[] => [
  { name: "name", label, type: "text", required: true },
  { name: "employer", label: "Pracodawca (adresat wniosku)", type: "text", required: true },
  { name: "place", label: "Miejscowość", type: "text", required: true, hint: "Do nagłówka wniosku" },
  { name: "date", label: "Data wniosku", type: "date", required: true },
];

export const childFields: FieldDef[] = [
  { name: "childName", label: "Imię i nazwisko dziecka", type: "text", required: true, hint: "Wpisz, jeśli dziecko ma już nadane imię" },
  { name: "childBirthDate", label: "Data urodzenia dziecka", type: "date", required: true },
];

export const periodFields = (prefix: string, label: string, required = true): FieldDef[] => [
  { name: `${prefix}From`, label: `${label} – od`, type: "date", required },
  { name: `${prefix}To`, label: `${label} – do`, type: "date", required },
];

/** to >= from check for period field pairs. */
export function checkPeriods(v: FormValues, ...prefixes: string[]): Record<string, string> {
  const e: Record<string, string> = {};
  for (const p of prefixes) {
    const from = str(v, `${p}From`);
    const to = str(v, `${p}To`);
    if (from && to && to < from) e[`${p}To`] = "Data końcowa nie może być wcześniejsza niż początkowa";
  }
  return e;
}

export const SIGNATURE = "(podpis pracownika)";
