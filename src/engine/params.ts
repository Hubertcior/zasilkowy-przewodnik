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
    /** Sickness benefit after insurance ends if incapacity arose within this many days (art. 7 u.z.). */
    afterInsuranceIllnessWithinDays: nonNegativeInt,
    /** Incapacity periods are summed into one benefit period if the break is at most this many days (art. 9 ust. 2 u.z.). */
    periodsMergeMaxGapDays: nonNegativeInt,
  }),

  /** Rehabilitation benefit after the benefit period is exhausted (art. 18–19 u.z.). Info only. */
  rehabilitation: z.object({
    firstMonthsRate: rate,
    firstMonths: positiveInt,
    laterRate: rate,
    pregnancyRate: rate,
    maxMonths: positiveInt,
  }),

  /** Payer reporting more than this many insured (as of 30 Nov of previous year) pays benefits itself. Art. 61 ustawy zasiłkowej. */
  payerThresholdInsured: positiveInt,

  deadlines: z.object({
    longApplicationDaysAfterBirth: positiveInt,
    maternityStartWeeksBeforeDue: positiveInt,
    /** Application for parental leave at least N days before it starts (art. 182^1b KP). */
    parentalApplicationDaysBefore: positiveInt,
    /** Application for supplementary leave at least N days before maternity leave ends (art. 180^1 KP). */
    supplementaryApplicationDaysBeforeMaternityEnd: positiveInt,
    /** Application for paternity leave at least N days before it starts (art. 182^3 KP). */
    paternityApplicationDaysBefore: positiveInt,
    /** Application to combine parental leave with work at least N days before starting work (art. 182^1e KP). */
    combineWorkApplicationDaysBefore: positiveInt,
    /** Resignation from part of maternity leave (after 14 weeks) at least N days before returning to work (art. 180 § 6 KP). */
    maternityResignationDaysBefore: positiveInt,
    /** Birth registration in the civil registry office within N days (Prawo o aktach stanu cywilnego). */
    birthRegistrationDays: positiveInt,
    /** Benefit applications may be filed electronically (equivalent to paper) from this date. */
    electronicApplicationsFrom: isoDate,
  }),

  /** Thresholds for risk warnings (KAN-19). Heuristics, not legal limits. */
  warnings: z.object({
    /** Pregnancy start is estimated as due/birth date minus this many weeks. */
    pregnancyWeeks: positiveInt,
    /** Insurance started this many months before pregnancy (or later) → "sham contract" risk. */
    recentInsuranceMonths: positiveInt,
    /** Base above this multiple of the minimum wage counts as high. */
    highBaseMinWageMultiple: z.number().positive(),
    /** Declared base increase in pregnancy vs pre-pregnancy average that triggers a warning. */
    baseIncreaseThreshold: z.number().positive(),
    /** Employee pay change in pregnancy vs pre-pregnancy average that triggers a warning. */
    incomeChangeThreshold: z.number().positive(),
    /** Days before the 21-day deadline when the info turns into a warning. */
    deadlineWarnDays: positiveInt,
    /** Fixed-term / trial (> 1 month) contract ending after this month of pregnancy is extended until birth (art. 177 § 3 KP). */
    kpFixedTermPregnancyMonth: positiveInt,
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
