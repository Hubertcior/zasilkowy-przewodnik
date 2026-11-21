import { z } from "zod";
import { round2 } from "./money";

// All legal numbers (rates, periods, limits) live in Params, never as magic numbers in the engine.
// Defaults: src/config/params.default.json. At runtime they come from ParamsStore (src/server).

const rate = z.number().min(0).max(1);
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Oczekiwano daty w formacie YYYY-MM-DD");

const FormSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  validFrom: isoDate.optional(),
  validTo: isoDate.optional(),
  replaces: z.array(z.string()).optional(),
  note: z.string().optional(),
});

export const ParamsSchema = z.object({
  version: z.string().min(1),
  effectiveFrom: isoDate,
  source: z.string().min(1),

  /** Employee social contributions deducted from gross before computing the benefit base. */
  contributionRate: rate,
  /** Minimum wage (PLN). Min benefit base = minWage × (1 − contributionRate). Art. 47 ustawy zasiłkowej. */
  minWage: z.number().positive(),
  /** Max contribution base for non-employees (PLN). Art. 48b ustawy zasiłkowej. */
  maxContributionBaseNonEmployee: z.number().positive(),

  rates: z.object({
    maternity: rate,
    maternityLikeAdoption: rate,
    supplementary: rate,
    paternity: rate,
    parental: rate,
    longApplication: rate,
    pregnancySickness: rate,
    standardSickness: rate,
    benefitEqualToMaternity: rate,
  }),

  /** Maternity leave weeks by number of children born at one birth (5 = 5 or more). Art. 180 KP. */
  maternityWeeksByChildren: z.object({
    "1": positiveInt,
    "2": positiveInt,
    "3": positiveInt,
    "4": positiveInt,
    "5": positiveInt,
  }),
  adoptionMinWeeks: positiveInt,
  motherObligatoryWeeks: positiveInt,

  parentalWeeks: z.object({
    single: positiveInt,
    multiple: positiveInt,
    zaZyciemSingle: positiveInt,
    zaZyciemMultiple: positiveInt,
  }),
  nonTransferableWeeks: nonNegativeInt,
  parentalMaxParts: positiveInt,
  parentalUntilYearChildTurns: positiveInt,

  combineWork: z.object({ maxWorkFraction: rate }),

  paternity: z.object({
    weeks: positiveInt,
    maxParts: positiveInt,
    minPartWeeks: positiveInt,
    untilChildMonths: positiveInt,
    adoptionMonthsFromRuling: positiveInt,
    adoptionMaxChildAge: positiveInt,
  }),

  /** Supplementary maternity leave for premature / hospitalised newborns. Art. 180^1 KP. */
  supplementary: z.object({
    extreme: z.object({
      beforeGestationWeek: positiveInt,
      maxBirthWeightG: positiveInt,
      weeksPerHospitalWeek: z.number().positive(),
      maxWeeks: positiveInt,
    }),
    preterm: z.object({
      fromGestationWeek: positiveInt,
      beforeGestationWeek: positiveInt,
      minBirthWeightGExclusive: positiveInt,
      weeksPerHospitalWeek: z.number().positive(),
      maxWeeks: positiveInt,
    }),
    term: z.object({
      fromGestationWeek: positiveInt,
      minConsecutiveHospitalDays: positiveInt,
      hospitalWindowFromDay: positiveInt,
      hospitalWindowToDay: positiveInt,
      weeksPerHospitalWeek: z.number().positive(),
      maxWeeks: positiveInt,
    }),
    multiplesUseLowestWeightAndLongestHospitalization: z.boolean(),
    roundPartialWeekUp: z.boolean(),
  }),

  /** Death of the child. Art. 180 § 4–5 KP. */
  childDeath: z.object({
    maternityWeeksIfBefore8Weeks: positiveInt,
    minDaysAfterDeath: positiveInt,
    daysAfterDeathIfAfter8Weeks: positiveInt,
  }),

  pregnancy: z.object({
    /** Days of sick pay paid by the employer per year (art. 92 KP). */
    employerPaidDays: z.object({ under50: positiveInt, from50: positiveInt }),
    /** Max sickness benefit period during pregnancy (art. 8 ustawy zasiłkowej). */
    maxBenefitDays: positiveInt,
    /** Waiting period before sickness benefit (art. 4 ustawy zasiłkowej). */
    waitingDays: z.object({ obowiazkowe: nonNegativeInt, dobrowolne: nonNegativeInt }),
    /** Earlier insurance periods count towards the waiting period if the break was at most this many days (art. 4 ust. 2 u.z.). */
    waitingMaxGapDays: nonNegativeInt,
  }),

  /** Payer reporting more than this many insured (as of 30 Nov of previous year) pays benefits itself. Art. 61 ustawy zasiłkowej. */
  payerThresholdInsured: positiveInt,

  deadlines: z.object({
    longApplicationDaysAfterBirth: positiveInt,
    maternityStartWeeksBeforeDue: positiveInt,
  }),

  adoptionAgeLimits: z.object({
    pieczaYears: positiveInt,
    pieczaPostponedSchoolYears: positiveInt,
    adopcjaYears: positiveInt,
  }),

  forms: z.array(FormSchema),
});

export type Params = z.infer<typeof ParamsSchema>;
export type FormInfo = z.infer<typeof FormSchema>;

/** Minimum monthly benefit base for employees: minWage less employee social contributions. */
export function minBase(p: Params): number {
  return round2(p.minWage * (1 - p.contributionRate));
}

/** Maximum monthly benefit base for non-employees (voluntary sickness insurance). */
export function maxBaseNonEmployee(p: Params): number {
  return round2(p.maxContributionBaseNonEmployee * (1 - p.contributionRate));
}
