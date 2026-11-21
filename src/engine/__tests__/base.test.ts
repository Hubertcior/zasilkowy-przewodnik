import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { calcBase } from "@/engine/base";
import { ParamsSchema } from "@/engine/params";
import type { InsurancePeriod, MonthlyIncome, ParentData } from "@/engine/types";

const params = ParamsSchema.parse(defaults);

/** 12 months before June 2026: 2025-06 … 2026-05 */
const MONTHS_12 = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 5 + i, 1));
  return d.toISOString().slice(0, 7);
});

function employee(incomes: MonthlyIncome[], extra: Partial<ParentData> = {}, period: Partial<InsurancePeriod> = {}): ParentData {
  return {
    role: "matka",
    periods: [{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01", ...period }],
    incomes,
    ...extra,
  };
}

const flat = (gross: number, months = MONTHS_12): MonthlyIncome[] => months.map((month) => ({ month, gross }));

describe("calcBase – employee", () => {
  it("12 × 7000 gross → 6040.30", () => {
    const r = calcBase({ parent: employee(flat(7000)), title: "umowa_o_prace", rightDate: "2026-06-10" }, params);
    expect(r.base).toBe(6040.3);
    expect(r.method).toBe("employee_12m");
    expect(r.monthsUsed).toHaveLength(12);
    expect(r.steps.at(-1)).toBe("Podstawa wymiaru zasiłku: 6\u00a0040,30\u00a0zł.");
  });

  it("month with < 1/2 worked is excluded → average of 11 months", () => {
    const incomes = flat(7000).map((m) =>
      m.month === "2026-01" ? { ...m, gross: 2000, daysWorked: 9, workingDays: 21 } : m,
    );
    const r = calcBase({ parent: employee(incomes), title: "umowa_o_prace", rightDate: "2026-06-10" }, params);
    expect(r.monthsUsed).toHaveLength(11);
    expect(r.excludedMonths).toEqual([{ month: "2026-01", reason: expect.stringContaining("mniej niż połowę") }]);
    expect(r.base).toBe(6040.3);
    expect(r.steps.some((s) => s.includes("Pominięto 2026-01"))).toBe(true);
  });

  it("supplements the variable component of an incomplete month (≥ 1/2 worked)", () => {
    const incomes = flat(6000).map((m) =>
      m.month === "2026-03" ? { ...m, fixed: 5000, variable: 1000, daysWorked: 15, workingDays: 20 } : m,
    );
    const r = calcBase({ parent: employee(incomes), title: "umowa_o_prace", rightDate: "2026-06-10" }, params);
    const march = r.monthsUsed.find((m) => m.month === "2026-03")!;
    expect(march.amount).toBe(6333.33);
    expect(march.note).toContain("uzupełniono");
    expect(r.grossAverage).toBe(6027.78);
    expect(r.base).toBe(5201.37);
  });

  it("adds quarterly (1/12 of 4 previous quarters) and annual (1/12 of previous year) bonuses", () => {
    const parent = employee(flat(6000), {
      bonuses: [
        { kind: "kwartalna", amount: 1500, period: "2025-Q1" }, // too old – ignored
        { kind: "kwartalna", amount: 1500, period: "2025-Q2" },
        { kind: "kwartalna", amount: 1500, period: "2025-Q3" },
        { kind: "kwartalna", amount: 1500, period: "2025-Q4" },
        { kind: "kwartalna", amount: 1500, period: "2026-Q1" },
        { kind: "roczna", amount: 12000, period: "2025" },
      ],
    });
    const r = calcBase({ parent, title: "umowa_o_prace", rightDate: "2026-06-10" }, params);
    expect(r.grossAverage).toBe(7500);
    expect(r.base).toBe(6471.75);
    expect(r.steps.some((s) => s.includes("Premie kwartalne"))).toBe(true);
    expect(r.steps.some((s) => s.includes("Premia roczna"))).toBe(true);
  });

  it("employment for 3 months → average of full months of insurance", () => {
    const parent = employee(
      [
        { month: "2026-02", gross: 3000 }, // partial start month – not a full month
        { month: "2026-03", gross: 6000 },
        { month: "2026-04", gross: 6000 },
        { month: "2026-05", gross: 7500 },
      ],
      {},
      { from: "2026-02-16" },
    );
    const r = calcBase({ parent, title: "umowa_o_prace", rightDate: "2026-06-10" }, params);
    expect(r.method).toBe("employee_shorter");
    expect(r.monthsUsed.map((m) => m.month)).toEqual(["2026-03", "2026-04", "2026-05"]);
    expect(r.base).toBe(5608.85);
  });

  it("right in the 1st month of work → contract salary for a full month", () => {
    const parent = employee([], { contractSalary: 6000 }, { from: "2026-06-15" });
    const r = calcBase({ parent, title: "umowa_o_prace", rightDate: "2026-06-20" }, params);
    expect(r.method).toBe("employee_first_month");
    expect(r.base).toBe(5177.4);
  });

  it("right in the 2nd month → supplemented pay for the 1st month", () => {
    const parent = employee(
      [{ month: "2026-05", gross: 3000, daysWorked: 10, workingDays: 21 }],
      { contractSalary: 6000 },
      { from: "2026-05-18" },
    );
    const r = calcBase({ parent, title: "umowa_o_prace", rightDate: "2026-06-10" }, params);
    expect(r.method).toBe("employee_second_month");
    expect(r.base).toBe(5436.27);
  });

  it("salary 3000 → raised to the minimum base 4147.10", () => {
    const r = calcBase({ parent: employee(flat(3000)), title: "umowa_o_prace", rightDate: "2026-06-10" }, params);
    expect(r.base).toBe(4147.1);
    expect(r.adjusted).toBe("minimum");
    expect(r.steps.some((s) => s.includes("minimum"))).toBe(true);
  });

  it("part-time minimum is proportional to employment fraction", () => {
    const r = calcBase(
      { parent: employee(flat(2000), {}, { workTimeFraction: 0.5 }), title: "umowa_o_prace", rightDate: "2026-06-10" },
      params,
    );
    expect(r.base).toBe(2073.55);
  });

  it("all months below 1/2 worked → full-month contract salary", () => {
    const incomes = flat(1000).map((m) => ({ ...m, workedHalfOrMore: false }));
    const r = calcBase({ parent: employee(incomes, { contractSalary: 5000 }), title: "umowa_o_prace", rightDate: "2026-06-10" }, params);
    expect(r.method).toBe("employee_full_month_fallback");
    expect(r.base).toBe(4314.5);
  });

  it("skips excluded components", () => {
    const incomes = flat(7500).map((m) => ({ ...m, excluded: 500 }));
    const r = calcBase({ parent: employee(incomes), title: "umowa_o_prace", rightDate: "2026-06-10" }, params);
    expect(r.base).toBe(6040.3);
  });
});

describe("calcBase – non-employee", () => {
  it("JDG with declared base 25 000 → capped at 20 321.30", () => {
    const parent: ParentData = {
      role: "matka",
      periods: [{ title: "dzialalnosc", sickness: "dobrowolne", from: "2022-01-01" }],
      incomes: [],
      declaredBase: MONTHS_12.map((month) => ({ month, amount: 25000 })),
    };
    const r = calcBase({ parent, title: "dzialalnosc", rightDate: "2026-06-10" }, params);
    expect(r.base).toBe(20321.3);
    expect(r.adjusted).toBe("cap");
    expect(r.method).toBe("non_employee_12m");
  });

  it("non-employee has no minimum (low declared base stays low)", () => {
    const parent: ParentData = {
      role: "matka",
      periods: [{ title: "dzialalnosc", sickness: "dobrowolne", from: "2022-01-01" }],
      incomes: [],
      declaredBase: MONTHS_12.map((month) => ({ month, amount: 2000 })),
    };
    expect(calcBase({ parent, title: "dzialalnosc", rightDate: "2026-06-10" }, params).base).toBe(1725.8);
  });

  it("zlecenie: shorter insurance uses gross revenue from full months", () => {
    const parent: ParentData = {
      role: "matka",
      periods: [{ title: "zlecenie", sickness: "dobrowolne", from: "2026-03-01" }],
      incomes: [
        { month: "2026-03", gross: 6000 },
        { month: "2026-04", gross: 6000 },
        { month: "2026-05", gross: 7500 },
      ],
    };
    const r = calcBase({ parent, title: "zlecenie", rightDate: "2026-06-10" }, params);
    expect(r.method).toBe("non_employee_shorter");
    expect(r.base).toBe(5608.85);
  });
});

describe("calcBase – previous base", () => {
  const parent = employee(flat(7000));

  it("break < 1 month → previousBase is reused", () => {
    const r = calcBase(
      { parent, title: "umowa_o_prace", rightDate: "2026-06-10", previousBase: { amount: 5000, lastBenefitEnd: "2026-05-20" } },
      params,
    );
    expect(r.method).toBe("previous_base");
    expect(r.base).toBe(5000);
  });

  it("break ≥ 1 month → base recalculated", () => {
    const r = calcBase(
      { parent, title: "umowa_o_prace", rightDate: "2026-06-21", previousBase: { amount: 5000, lastBenefitEnd: "2026-05-20" } },
      params,
    );
    expect(r.method).toBe("employee_12m");
    expect(r.base).toBe(6040.3);
  });
});
