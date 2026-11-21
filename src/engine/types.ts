// Domain types for the benefits engine. Later tasks may extend these.

export type InsuranceTitle = 'umowa_o_prace' | 'zlecenie' | 'dzialalnosc' | 'inne';

export type SicknessInsurance = 'obowiazkowe' | 'dobrowolne' | 'brak';

export interface InsurancePeriod {
  title: InsuranceTitle;
  sickness: SicknessInsurance;
  /** ISO date YYYY-MM-DD */
  from: string;
  /** ISO date YYYY-MM-DD; undefined = ongoing */
  to?: string;
  payerName?: string;
  /** Number of people reported for sickness insurance by the payer (>20 → payer pays benefits). */
  payerInsuredCount?: number;
  /** Employment fraction (etat), 1 = full time. Used to scale the employee minimum base. */
  workTimeFraction?: number;
  terminationReason?: 'upadlosc' | 'likwidacja' | 'smierc_pracodawcy' | 'naruszenie_prawa_wyrok' | 'inne';
}

export interface MonthlyIncome {
  /** YYYY-MM */
  month: string;
  /** Gross pay (brutto) included in the contribution base for this month. */
  gross: number;
  workedHalfOrMore?: boolean;
  /** Fixed components at their full monthly (contractual) amount. */
  fixed?: number;
  /** Variable components actually paid for the days worked. */
  variable?: number;
  /** Components not included in the benefit base (e.g. paid also during benefit). Subtracted from gross. */
  excluded?: number;
  daysWorked?: number;
  workingDays?: number;
}

export interface PeriodicBonus {
  kind: 'kwartalna' | 'roczna';
  amount: number;
  /** 'YYYY-Qn' for quarterly, 'YYYY' for annual */
  period: string;
}

export interface ParentData {
  role: 'matka' | 'ojciec';
  age?: number;
  periods: InsurancePeriod[];
  incomes: MonthlyIncome[];
  bonuses?: PeriodicBonus[];
  contractSalary?: number;
  /** Declared contribution base (e.g. self-employed), per month. */
  declaredBase?: { month: string; amount: number }[];
  contributionDebt?: number;
  sickDaysThisYear?: number;
}

export interface Prematurity {
  gestationWeek: number;
  birthWeightG: number;
  hospitalWeeks: number;
  hospitalStartDay?: number;
}

export type Scenario =
  | { kind: 'ciaza'; dueDate: string }
  | {
      kind: 'urodzenie';
      birthDate: string;
      children: number;
      zaZyciem: boolean;
      prematurity?: Prematurity;
      childDeath?: { date: string };
      stillbirth?: boolean;
    }
  | {
      kind: 'adopcja' | 'piecza';
      acceptDate: string;
      children: number;
      childAges: number[];
      postponedSchool?: boolean;
    };

export interface ParentalPart {
  parent: 'matka' | 'ojciec';
  weeks: number;
  /** Fraction of full-time work combined with parental leave, 0..0.5 */
  workFraction?: number;
}

export interface LeavePlan {
  /** Application for full leave submitted within 21 days after birth (81.5% variant). */
  longApplication: boolean;
  motherMaternityWeeks?: number;
  fatherTakesOverFromWeek?: number;
  parental: ParentalPart[];
  paternityWeeks?: 0 | 1 | 2;
}

export interface Warning {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  text: string;
  /** Legal source, e.g. "art. 29 ust. 1 ustawy zasiłkowej" */
  source?: string;
}

export type PeriodType =
  | 'macierzynski'
  | 'na_warunkach_macierzynskiego'
  | 'uzupelniajacy'
  | 'rodzicielski'
  | 'ojcowski'
  | 'wynagrodzenie_chorobowe'
  | 'chorobowy_ciaza'
  | 'zasilek_wys_macierzynskiego';

export interface BenefitPeriod {
  type: PeriodType;
  parent: 'matka' | 'ojciec';
  from: string;
  to: string;
  days: number;
  /** Percentage rate as fraction, e.g. 0.815 */
  rate: number;
  base: number;
  monthlyAmount: number;
  total: number;
  payer: 'platnik' | 'ZUS' | 'pracodawca';
}

export interface CaseFile {
  id: string;
  title: string;
  description: string;
  synthetic: boolean;
  parents: ParentData[];
  scenario: Scenario;
  plan?: LeavePlan;
  expected?: { granted: boolean; base?: number; monthly?: number; notes?: string };
}
