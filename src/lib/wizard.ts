import { addMonths, format, parseISO, subMonths } from "date-fns";
import { z } from "zod";
import type { InsurancePeriod, ParentData, PeriodicBonus, Scenario } from "@/engine/types";

// Manual-entry wizard (/kreator): form model + conversion to the engine model (ParentData + Scenario).

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę");
const optDate = z.union([isoDate, z.literal("")]).optional();
const optNum = z.number({ error: "Podaj liczbę" }).finite().nonnegative("Kwota nie może być ujemna").optional();

export const ParentFormSchema = z.object({
  title: z.enum(["umowa_o_prace", "zlecenie", "dzialalnosc", "brak"]),
  sickness: z.enum(["obowiazkowe", "dobrowolne", "brak"]),
  from: optDate,
  to: optDate,
  bigPayer: z.enum(["tak", "nie", "nie_wiem"]),
  age50: z.boolean(),
  debt: optNum,
  incomeMode: z.enum(["szybki", "szczegolowy"]),
  avgGross: optNum,
  months: z.array(z.object({ gross: optNum, half: z.boolean() })).length(12),
  quarterlyBonuses: optNum,
  annualBonus: optNum,
  declaredBase: optNum,
});

/** Parent rules (applied to the mother always, to the father only when he takes part). */
function refineParent(p: z.infer<typeof ParentFormSchema>, ctx: z.RefinementCtx, prefix: "mother" | "father") {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [prefix, path], message });
  if (p.title === "brak") return;
  if (!p.from) issue("from", "Podaj datę rozpoczęcia");
  if (p.from && p.to && p.to < p.from) issue("to", "Data końca jest wcześniejsza niż początek");
  if (p.title === "dzialalnosc") {
    if (p.sickness !== "brak" && p.declaredBase === undefined) issue("declaredBase", "Podaj deklarowaną podstawę składek");
  } else if (p.incomeMode === "szybki" && p.avgGross === undefined) {
    issue("avgGross", "Podaj średnie wynagrodzenie brutto");
  } else if (p.incomeMode === "szczegolowy" && p.months.every((m) => m.gross === undefined)) {
    issue("months", "Podaj wynagrodzenie przynajmniej za jeden miesiąc");
  }
}

export const WizardSchema = z
  .object({
    situation: z.enum(["planuje", "ciaza", "urodzenie", "adopcja", "piecza"]),
    dueDate: optDate,
    birthDate: optDate,
    children: z.number().int().min(1, "Co najmniej 1").max(10),
    zaZyciem: z.boolean(),
    premature: z.boolean(),
    gestationWeek: z.number().int().min(20, "Od 20. tygodnia").max(45).optional(),
    birthWeightG: z.number().int().min(300, "Podaj masę w gramach").max(7000).optional(),
    hospitalWeeks: z.number().min(0).max(104).optional(),
    hospitalStartDay: z.number().int().min(0).max(365).optional(),
    childDeath: z.boolean(),
    childDeathDate: optDate,
    stillbirth: z.boolean(),
    acceptDate: optDate,
    childAges: z.string().optional(),
    postponedSchool: z.boolean(),
    mother: ParentFormSchema,
    fatherSkip: z.boolean(),
    father: ParentFormSchema,
  })
  .superRefine((w, ctx) => {
    refineParent(w.mother, ctx, "mother");
    if (!w.fatherSkip) refineParent(w.father, ctx, "father");
    if (w.situation === "ciaza" && !w.dueDate) ctx.addIssue({ code: "custom", path: ["dueDate"], message: "Podaj przewidywaną datę porodu" });
    if (w.situation === "urodzenie") {
      if (!w.birthDate) ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Podaj datę porodu" });
      if (w.premature) {
        if (w.gestationWeek === undefined) ctx.addIssue({ code: "custom", path: ["gestationWeek"], message: "Podaj tydzień ciąży" });
        if (w.birthWeightG === undefined) ctx.addIssue({ code: "custom", path: ["birthWeightG"], message: "Podaj masę urodzeniową" });
        if (w.hospitalWeeks === undefined) ctx.addIssue({ code: "custom", path: ["hospitalWeeks"], message: "Podaj czas pobytu w szpitalu" });
      }
      if (w.childDeath && !w.stillbirth && !w.childDeathDate) {
        ctx.addIssue({ code: "custom", path: ["childDeathDate"], message: "Podaj datę zgonu" });
      }
      if (w.childDeath && w.birthDate && w.childDeathDate && w.childDeathDate < w.birthDate) {
        ctx.addIssue({ code: "custom", path: ["childDeathDate"], message: "Data zgonu jest wcześniejsza niż data porodu" });
      }
    }
    if (w.situation === "adopcja" || w.situation === "piecza") {
      if (!w.acceptDate) ctx.addIssue({ code: "custom", path: ["acceptDate"], message: "Podaj datę przyjęcia dziecka" });
      const ages = parseAges(w.childAges);
      if (!ages || ages.length === 0) ctx.addIssue({ code: "custom", path: ["childAges"], message: "Podaj wiek dzieci, np. 2 lub 2, 5" });
    }
  });

export type ParentForm = z.infer<typeof ParentFormSchema>;
export type WizardForm = z.infer<typeof WizardSchema>;

export function parseAges(s: string | undefined): number[] | undefined {
  if (!s?.trim()) return undefined;
  const parts = s.split(/[,;\s]+/).filter(Boolean).map(Number);
  return parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 18) ? parts : undefined;
}

export function emptyParent(): ParentForm {
  return {
    title: "umowa_o_prace",
    sickness: "obowiazkowe",
    from: "",
    to: "",
    bigPayer: "nie_wiem",
    age50: false,
    debt: undefined,
    incomeMode: "szybki",
    avgGross: undefined,
    months: Array.from({ length: 12 }, () => ({ gross: undefined, half: true })),
    quarterlyBonuses: undefined,
    annualBonus: undefined,
    declaredBase: undefined,
  };
}

export function emptyWizard(): WizardForm {
  return {
    situation: "ciaza",
    dueDate: "",
    birthDate: "",
    children: 1,
    zaZyciem: false,
    premature: false,
    childDeath: false,
    childDeathDate: "",
    stillbirth: false,
    acceptDate: "",
    childAges: "",
    postponedSchool: false,
    mother: emptyParent(),
    fatherSkip: true,
    father: emptyParent(),
  };
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Reference date of the scenario (birth / due / acceptance); "planning" assumes birth in 9 months. */
export function referenceDate(w: WizardForm, today: string): string {
  switch (w.situation) {
    case "planuje":
      return iso(addMonths(parseISO(today), 9));
    case "ciaza":
      return w.dueDate || today;
    case "urodzenie":
      return w.birthDate || today;
    default:
      return w.acceptDate || today;
  }
}

/** The 12 calendar months before the month of `ref`, oldest first. */
export function monthsBefore(ref: string): string[] {
  const start = parseISO(`${ref.slice(0, 7)}-01`);
  return Array.from({ length: 12 }, (_, i) => format(subMonths(start, 12 - i), "yyyy-MM"));
}

function bonuses(p: ParentForm, ref: string): PeriodicBonus[] {
  const out: PeriodicBonus[] = [];
  const [y, m] = ref.split("-").map(Number);
  if (p.quarterlyBonuses) {
    // The total for the last 4 quarters, split evenly over them.
    const q = Math.floor((m - 1) / 3);
    for (let i = 1; i <= 4; i++) {
      const idx = y * 4 + q - i;
      out.push({ kind: "kwartalna", amount: Math.round((p.quarterlyBonuses / 4) * 100) / 100, period: `${Math.floor(idx / 4)}-Q${(idx % 4) + 1}` });
    }
  }
  if (p.annualBonus) out.push({ kind: "roczna", amount: p.annualBonus, period: String(y - 1) });
  return out;
}

export function parentFormToData(role: "matka" | "ojciec", p: ParentForm, ref: string): ParentData {
  const months = monthsBefore(ref);
  if (p.title === "brak") return { role, age: p.age50 ? 50 : undefined, periods: [], incomes: [] };

  const period: InsurancePeriod = {
    title: p.title,
    sickness: p.title === "umowa_o_prace" ? "obowiazkowe" : p.sickness,
    from: p.from!,
    ...(p.to ? { to: p.to } : {}),
    ...(p.bigPayer === "tak" ? { payerInsuredCount: 21 } : p.bigPayer === "nie" ? { payerInsuredCount: 20 } : {}),
  };
  const data: ParentData = { role, periods: [period], incomes: [] };
  if (p.age50) data.age = 50;

  if (p.title === "dzialalnosc") {
    if (p.declaredBase !== undefined) data.declaredBase = months.map((month) => ({ month, amount: p.declaredBase! }));
    if (p.debt) data.contributionDebt = p.debt;
    return data;
  }
  if (p.incomeMode === "szybki") {
    data.incomes = months.map((month) => ({ month, gross: p.avgGross ?? 0 }));
    data.contractSalary = p.avgGross;
  } else {
    data.incomes = months.flatMap((month, i) => {
      const m = p.months[i];
      return m.gross === undefined ? [] : [{ month, gross: m.gross, workedHalfOrMore: m.half }];
    });
    data.contractSalary = [...p.months].reverse().find((m) => m.gross !== undefined && m.half)?.gross;
  }
  const b = bonuses(p, ref);
  if (b.length) data.bonuses = b;
  return data;
}

export function wizardToScenario(w: WizardForm, today: string): Scenario {
  const ref = referenceDate(w, today);
  switch (w.situation) {
    case "planuje":
    case "ciaza":
      return { kind: "ciaza", dueDate: ref };
    case "urodzenie":
      return {
        kind: "urodzenie",
        birthDate: ref,
        children: w.children,
        zaZyciem: w.zaZyciem,
        ...(w.premature && w.gestationWeek !== undefined && w.birthWeightG !== undefined && w.hospitalWeeks !== undefined
          ? { prematurity: { gestationWeek: w.gestationWeek, birthWeightG: w.birthWeightG, hospitalWeeks: w.hospitalWeeks, ...(w.hospitalStartDay !== undefined ? { hospitalStartDay: w.hospitalStartDay } : {}) } }
          : {}),
        ...(w.childDeath && w.stillbirth ? { stillbirth: true } : {}),
        ...(w.childDeath && !w.stillbirth && w.childDeathDate ? { childDeath: { date: w.childDeathDate } } : {}),
      };
    default: {
      const ages = parseAges(w.childAges) ?? [0];
      return {
        kind: w.situation,
        acceptDate: ref,
        children: ages.length,
        childAges: ages,
        ...(w.situation === "piecza" && w.postponedSchool ? { postponedSchool: true } : {}),
      };
    }
  }
}

export function wizardToCase(w: WizardForm, today: string): { parents: ParentData[]; scenario: Scenario } {
  const ref = referenceDate(w, today);
  const parents = [parentFormToData("matka", w.mother, ref)];
  if (!w.fatherSkip) parents.push(parentFormToData("ojciec", w.father, ref));
  return { parents, scenario: wizardToScenario(w, today) };
}

/** Field paths validated on each wizard step. */
export const STEP_FIELDS: (keyof WizardForm | `mother.${string}` | `father.${string}`)[][] = [
  ["situation", "dueDate", "birthDate", "children", "gestationWeek", "birthWeightG", "hospitalWeeks", "childDeathDate", "acceptDate", "childAges"],
  ["mother.title", "mother.sickness", "mother.from", "mother.to", "mother.bigPayer", "mother.debt"],
  ["mother.avgGross", "mother.months", "mother.declaredBase", "mother.quarterlyBonuses", "mother.annualBonus"],
  ["father.title", "father.sickness", "father.from", "father.to", "father.avgGross", "father.months", "father.declaredBase"],
  [],
];
