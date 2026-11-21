import { z } from "zod";
import type { InsurancePeriod, LeavePlan, MonthlyIncome, ParentData, PeriodicBonus, Prematurity, Scenario } from "./types";

// Zod schemas for API input. Annotated with the domain types so they cannot drift from types.ts.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Oczekiwano daty YYYY-MM-DD");
const isoMonth = z.string().regex(/^\d{4}-\d{2}$/, "Oczekiwano miesiąca YYYY-MM");
const money = z.number().finite().nonnegative();
const role = z.enum(["matka", "ojciec"]);

export const InsurancePeriodSchema: z.ZodType<InsurancePeriod> = z.object({
  title: z.enum(["umowa_o_prace", "zlecenie", "dzialalnosc", "inne"]),
  sickness: z.enum(["obowiazkowe", "dobrowolne", "brak"]),
  from: isoDate,
  to: isoDate.optional(),
  payerName: z.string().max(200).optional(),
  payerInsuredCount: z.number().int().nonnegative().optional(),
  workTimeFraction: z.number().gt(0).max(1).optional(),
  terminationReason: z.enum(["upadlosc", "likwidacja", "smierc_pracodawcy", "naruszenie_prawa_wyrok", "inne"]).optional(),
});

export const MonthlyIncomeSchema: z.ZodType<MonthlyIncome> = z.object({
  month: isoMonth,
  gross: money,
  workedHalfOrMore: z.boolean().optional(),
  fixed: money.optional(),
  variable: money.optional(),
  excluded: money.optional(),
  daysWorked: z.number().int().nonnegative().max(31).optional(),
  workingDays: z.number().int().positive().max(31).optional(),
});

export const PeriodicBonusSchema: z.ZodType<PeriodicBonus> = z.object({
  kind: z.enum(["kwartalna", "roczna"]),
  amount: money,
  period: z.string().regex(/^\d{4}(-Q[1-4])?$/, "Oczekiwano 'YYYY' albo 'YYYY-Qn'"),
});

export const ParentDataSchema: z.ZodType<ParentData> = z.object({
  role,
  age: z.number().int().min(14).max(80).optional(),
  periods: z.array(InsurancePeriodSchema).max(50),
  incomes: z.array(MonthlyIncomeSchema).max(60),
  bonuses: z.array(PeriodicBonusSchema).max(40).optional(),
  contractSalary: money.optional(),
  declaredBase: z.array(z.object({ month: isoMonth, amount: money })).max(60).optional(),
  contributionDebt: money.optional(),
  sickDaysThisYear: z.number().int().nonnegative().max(366).optional(),
});

export const PrematuritySchema: z.ZodType<Prematurity> = z.object({
  gestationWeek: z.number().int().min(20).max(45),
  birthWeightG: z.number().int().positive().max(7000),
  hospitalWeeks: z.number().nonnegative().max(104),
  hospitalStartDay: z.number().int().nonnegative().max(365).optional(),
});

const children = z.number().int().min(1).max(10);

export const ScenarioSchema: z.ZodType<Scenario> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ciaza"), dueDate: isoDate }),
  z.object({
    kind: z.literal("urodzenie"),
    birthDate: isoDate,
    children,
    zaZyciem: z.boolean(),
    prematurity: PrematuritySchema.optional(),
    childDeath: z.object({ date: isoDate }).optional(),
    stillbirth: z.boolean().optional(),
  }),
  z.object({
    kind: z.enum(["adopcja", "piecza"]),
    acceptDate: isoDate,
    children,
    childAges: z.array(z.number().int().min(0).max(18)).max(10),
    postponedSchool: z.boolean().optional(),
  }),
]);

export const LeavePlanSchema: z.ZodType<LeavePlan> = z.object({
  longApplication: z.boolean(),
  motherMaternityWeeks: z.number().min(0).max(52).optional(),
  fatherTakesOverFromWeek: z.number().min(0).max(52).optional(),
  parental: z
    .array(z.object({ parent: role, weeks: z.number().positive().max(67), workFraction: z.number().min(0).max(1).optional() }))
    .max(10),
  paternityWeeks: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  paternityStartWeek: z.number().min(0).max(104).optional(),
  specialTakeOver: z.enum(["szpital", "niezdolnosc_do_samodzielnej_egzystencji", "smierc_matki", "porzucenie_dziecka"]).optional(),
});

const parentsArray = z
  .array(ParentDataSchema)
  .min(1)
  .max(2)
  .refine((ps) => new Set(ps.map((p) => p.role)).size === ps.length, "Każda rola (matka, ojciec) może wystąpić tylko raz");

export const EligibilityRequestSchema = z.object({
  parents: parentsArray,
  scenario: ScenarioSchema,
  onDate: isoDate.optional(),
});

export const CalculateRequestSchema = z.object({
  parents: parentsArray,
  scenario: ScenarioSchema,
  plan: LeavePlanSchema.optional(),
  /** Manual base per role, e.g. { "matka": 6040.3 } – bypasses calcBase. */
  baseOverride: z.object({ matka: money.optional(), ojciec: money.optional() }).optional(),
  today: isoDate.optional(),
});

export const PregnancyRequestSchema = z.object({
  parent: ParentDataSchema,
  /** If omitted, the base is computed with calcBase for illnessFrom. */
  base: money.optional(),
  illnessFrom: isoDate,
  illnessTo: isoDate,
  codeB: z.boolean(),
  dueDate: isoDate.optional(),
  today: isoDate.optional(),
});

export type EligibilityRequest = z.infer<typeof EligibilityRequestSchema>;
export type CalculateRequest = z.infer<typeof CalculateRequestSchema>;
export type PregnancyRequest = z.infer<typeof PregnancyRequestSchema>;
