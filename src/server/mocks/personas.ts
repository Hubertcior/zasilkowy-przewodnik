import { addDays, addMonths, addYears, format, parseISO, subMonths } from "date-fns";
import type { InsurancePeriod, ParentData, Scenario } from "@/engine/types";

// SYMULACJA: fictional people for the mObywatel / ZUS data mock. All data (incl. PESEL) is synthetic.
// Dates are generated relative to `today`, so the demo never goes stale.

export interface Ezla {
  id: string;
  series: string;
  from: string;
  to: string;
  /** ZUS letter code: B = pregnancy, A = alcohol, … ; empty = none */
  code: "B" | "";
  diagnosisHint: string;
  doctor: string;
  issuedAt: string;
  status: "przyjete" | "anulowane";
  /** Who received the certificate from ZUS (employer > 20 insured, otherwise ZUS pays itself). */
  recipient: string;
}

export interface DebtDetail {
  label: string;
  amount: number;
}

export interface DebtEntry {
  date: string;
  amount: number;
  details?: DebtDetail[];
}

export interface Persona {
  id: string;
  name: string;
  /** Fictional PESEL – not a real person. */
  pesel: string;
  summary: string;
  tags: string[];
  parents: ParentData[];
  scenario: Scenario;
  ezla: Ezla[];
  /** Contribution debt (PLN) as of a given date; the mock returns the latest entry not after the asked date. */
  debt: DebtEntry[];
}

export interface PersonaSummary {
  id: string;
  name: string;
  summary: string;
  tags: string[];
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const month = (d: Date) => format(d, "yyyy-MM");

/** The 12 full months before `today`'s month, oldest first. */
function last12(today: Date): string[] {
  return Array.from({ length: 12 }, (_, i) => month(subMonths(today, 12 - i)));
}

const incomes = (today: Date, gross: number) => last12(today).map((m) => ({ month: m, gross }));
const declared = (today: Date, amount: number) => last12(today).map((m) => ({ month: m, amount }));

function employment(from: string, payerName: string, payerInsuredCount: number, extra: Partial<InsurancePeriod> = {}): InsurancePeriod {
  return { title: "umowa_o_prace", sickness: "obowiazkowe", from, payerName, payerInsuredCount, ...extra };
}

export function buildPersonas(todayIso: string = iso(new Date())): Persona[] {
  const t = parseISO(todayIso);
  const d = (days: number) => iso(addDays(t, days));
  const m = (months: number) => iso(addMonths(t, months));

  return [
    {
      id: "anna",
      name: "Anna Kowalczyk",
      pesel: "92030512348",
      summary: "Umowa o pracę w dużej firmie (120 osób), 7000 zł brutto, w ciąży – termin porodu za 3 miesiące. Dwa zwolnienia z kodem B.",
      tags: ["umowa o pracę", "ciąża", "płatnik > 20 osób", "partner na etacie"],
      parents: [
        {
          role: "matka",
          age: 33,
          periods: [employment("2019-03-01", "Nordlog Sp. z o.o.", 120)],
          incomes: incomes(t, 7000),
          contractSalary: 7000,
          sickDaysThisYear: 12,
        },
        {
          role: "ojciec",
          age: 35,
          periods: [employment("2017-09-01", "Budimex-Pol S.A.", 40)],
          incomes: incomes(t, 9000),
          contractSalary: 9000,
        },
      ],
      scenario: { kind: "ciaza", dueDate: m(3) },
      ezla: [
        { id: "ezla-anna-1", series: "ZL 1234567", from: d(-75), to: d(-70), code: "B", diagnosisHint: "ciąża – nudności", doctor: "lek. Jan Nowak (fikcyjny)", issuedAt: d(-75), status: "przyjete", recipient: "Nordlog Sp. z o.o. (płatnik)" },
        { id: "ezla-anna-2", series: "ZL 1234890", from: d(-30), to: d(-24), code: "B", diagnosisHint: "ciąża – zalecenie odpoczynku", doctor: "lek. Jan Nowak (fikcyjny)", issuedAt: d(-30), status: "przyjete", recipient: "Nordlog Sp. z o.o. (płatnik)" },
      ],
      debt: [{ date: "2000-01-01", amount: 0 }],
    },
    {
      id: "kasia",
      name: "Katarzyna Wiśniewska",
      pesel: "90111023456",
      summary: "Jednoosobowa działalność z dobrowolnym chorobowym od 2 lat, podstawa 5000 zł, bez zadłużenia. 10 dni po porodzie.",
      tags: ["działalność", "dobrowolne chorobowe", "po porodzie", "partner na etacie"],
      parents: [
        {
          role: "matka",
          age: 35,
          periods: [{ title: "dzialalnosc", sickness: "dobrowolne", from: iso(addYears(t, -2)) }],
          incomes: [],
          declaredBase: declared(t, 5000),
          contributionDebt: 0,
        },
        {
          role: "ojciec",
          age: 36,
          periods: [employment("2015-02-01", "Serwis-Tech Sp. j.", 15)],
          incomes: incomes(t, 8000),
          contractSalary: 8000,
        },
      ],
      scenario: { kind: "urodzenie", birthDate: d(-10), children: 1, zaZyciem: false },
      ezla: [],
      // A small arrear 4 months ago, paid off a month later – shows that the debt is checked as of a given day.
      debt: [
        { date: "2000-01-01", amount: 0 },
        { date: d(-120), amount: 412.36, details: [{ label: "Ubezpieczenia społeczne (w tym chorobowe)", amount: 412.36 }] },
        { date: d(-90), amount: 0 },
      ],
    },
    {
      id: "ola",
      name: "Aleksandra Zielińska",
      pesel: "95070734567",
      summary: "Działalność gospodarcza bez dobrowolnego ubezpieczenia chorobowego – w ciąży, termin za 4 miesiące. Brak prawa do zasiłków.",
      tags: ["działalność", "brak chorobowego", "ciąża"],
      parents: [
        {
          role: "matka",
          age: 30,
          periods: [{ title: "dzialalnosc", sickness: "brak", from: "2022-05-01" }],
          incomes: [],
          declaredBase: declared(t, 4500),
          contributionDebt: 1250.4,
        },
      ],
      scenario: { kind: "ciaza", dueDate: m(4) },
      ezla: [],
      debt: [
        { date: "2000-01-01", amount: 0 },
        {
          date: d(-45),
          amount: 1250.4,
          details: [
            { label: "Ubezpieczenia społeczne", amount: 431.4 },
            { label: "Ubezpieczenie zdrowotne", amount: 819.0 },
          ],
        },
      ],
    },
    {
      id: "marta",
      name: "Marta Lewandowska",
      pesel: "97021245678",
      summary: "Umowa zlecenie z dobrowolnym chorobowym, płatnik zgłasza 8 osób (wypłaca ZUS). Wcześniak: 30. tydzień, 1400 g, 5 tygodni w szpitalu.",
      tags: ["umowa zlecenie", "wypłaca ZUS", "wcześniak"],
      parents: [
        {
          role: "matka",
          age: 28,
          periods: [{ title: "zlecenie", sickness: "dobrowolne", from: "2023-01-01", payerName: "Agencja Kreatywna Kropka", payerInsuredCount: 8 }],
          incomes: incomes(t, 5500),
        },
      ],
      scenario: {
        kind: "urodzenie",
        birthDate: d(-20),
        children: 1,
        zaZyciem: false,
        prematurity: { gestationWeek: 30, birthWeightG: 1400, hospitalWeeks: 5 },
      },
      ezla: [
        { id: "ezla-marta-1", series: "ZL 2233445", from: d(-60), to: d(-21), code: "B", diagnosisHint: "ciąża zagrożona", doctor: "lek. Ewa Duda (fikcyjna)", issuedAt: d(-60), status: "przyjete", recipient: "ZUS (płatnik zgłasza do 20 osób)" },
      ],
      debt: [{ date: "2000-01-01", amount: 0 }],
    },
    {
      id: "ewa-piotr",
      name: "Ewa i Piotr Kamińscy",
      pesel: "88041556789",
      summary: "Adopcja 2-letniego dziecka (przyjęte 5 dni temu). Oboje na etacie w dużych firmach.",
      tags: ["adopcja", "oboje na etacie", "płatnik > 20 osób"],
      parents: [
        { role: "matka", age: 37, periods: [employment("2014-06-01", "Bank Spółdzielczy Mazowsze", 300)], incomes: incomes(t, 6500), contractSalary: 6500 },
        { role: "ojciec", age: 39, periods: [employment("2012-10-01", "Energa-Sieci S.A.", 300)], incomes: incomes(t, 7500), contractSalary: 7500 },
      ],
      scenario: { kind: "adopcja", acceptDate: d(-5), children: 1, childAges: [2] },
      ezla: [],
      debt: [{ date: "2000-01-01", amount: 0 }],
    },
    {
      id: "magda",
      name: "Magdalena Wójcik",
      pesel: "93090967890",
      summary: "Umowa o pracę rozwiązana w ciąży (2 miesiące temu) z powodu likwidacji pracodawcy. Termin porodu za 2 miesiące.",
      tags: ["likwidacja pracodawcy", "ciąża", "zasiłek w wys. macierzyńskiego"],
      parents: [
        {
          role: "matka",
          age: 32,
          periods: [employment("2021-01-01", "Drukarnia Sigma Sp. z o.o. (w likwidacji)", 12, { to: m(-2), terminationReason: "likwidacja" })],
          incomes: last12(t)
            .filter((x) => x <= month(parseISO(m(-2))))
            .map((x) => ({ month: x, gross: 6000 })),
          contractSalary: 6000,
        },
      ],
      scenario: { kind: "ciaza", dueDate: m(2) },
      ezla: [],
      debt: [{ date: "2000-01-01", amount: 0 }],
    },
  ];
}

export function getPersona(id: string, today?: string): Persona | undefined {
  return buildPersonas(today).find((p) => p.id === id);
}

export function personaSummaries(today?: string): PersonaSummary[] {
  return buildPersonas(today).map(({ id, name, summary, tags }) => ({ id, name, summary, tags }));
}

/** Latest debt entry not after `date` (the debt balance as of that day). */
export function debtEntryOn(persona: Persona, date: string): DebtEntry {
  const entries = persona.debt.filter((x) => x.date <= date).sort((a, b) => b.date.localeCompare(a.date));
  return entries[0] ?? { date, amount: 0 };
}

export function debtOn(persona: Persona, date: string): number {
  return debtEntryOn(persona, date).amount;
}
