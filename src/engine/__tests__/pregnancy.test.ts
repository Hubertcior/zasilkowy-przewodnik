import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { ParamsSchema } from "@/engine/params";
import { calcPregnancy } from "@/engine/pregnancy";
import type { InsurancePeriod, ParentData } from "@/engine/types";

const params = ParamsSchema.parse(defaults);
const BASE = 6040.3;

const mother = (periods: InsurancePeriod[], extra: Partial<ParentData> = {}): ParentData => ({
  role: "matka",
  age: 26,
  periods,
  incomes: [],
  ...extra,
});
const employee = (extra: Partial<ParentData> = {}, count = 50) =>
  mother([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2022-01-01", payerInsuredCount: count }], extra);

// 60 days: 2026-03-01 … 2026-04-29
const SIXTY = { illnessFrom: "2026-03-01", illnessTo: "2026-04-29" };

describe("calcPregnancy", () => {
  it("employee 26, 60 days with code B → 33 days employer (100%) + 27 days benefit 100%", () => {
    const r = calcPregnancy({ parent: employee(), base: BASE, codeB: true, ...SIXTY }, params);
    expect(r.eligible).toBe(true);
    expect(r.periods.map((x) => [x.type, x.days, x.rate, x.payer])).toEqual([
      ["wynagrodzenie_chorobowe", 33, 1, "pracodawca"],
      ["chorobowy_ciaza", 27, 1, "platnik"],
    ]);
    expect(r.periods[1].from).toBe("2026-04-03");
    expect(r.periods[0].monthlyAmount).toBe(6040.3);
    expect(r.daysUsed).toBe(60);
    expect(r.daysLeft).toBe(210);
  });

  it("same at 51 → 14 + 46", () => {
    const r = calcPregnancy({ parent: employee({ age: 51 }), base: BASE, codeB: true, ...SIXTY }, params);
    expect(r.periods.map((x) => x.days)).toEqual([14, 46]);
  });

  it("small employer → benefit paid by ZUS; sick days already used this year are deducted", () => {
    const r = calcPregnancy({ parent: employee({ sickDaysThisYear: 20 }, 5), base: BASE, codeB: true, ...SIXTY }, params);
    expect(r.periods.map((x) => [x.days, x.payer])).toEqual([
      [13, "pracodawca"],
      [47, "ZUS"],
    ]);
  });

  it("JDG with voluntary insurance for 120 days → benefit from day 1", () => {
    const r = calcPregnancy(
      { parent: mother([{ title: "dzialalnosc", sickness: "dobrowolne", from: "2025-11-01" }]), base: 4000, codeB: true, ...SIXTY },
      params,
    );
    expect(r.eligible).toBe(true);
    expect(r.periods.map((x) => [x.type, x.days, x.payer, x.from])).toEqual([["chorobowy_ciaza", 60, "ZUS", "2026-03-01"]]);
  });

  it("JDG insured for 40 days → no right (90-day waiting period)", () => {
    const r = calcPregnancy(
      { parent: mother([{ title: "dzialalnosc", sickness: "dobrowolne", from: "2026-01-20" }]), base: 4000, codeB: true, illnessFrom: "2026-03-01", illnessTo: "2026-03-20" },
      params,
    );
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(" ")).toContain("Okres wyczekiwania");
  });

  it("waiting period ends during illness → paid only from the eligibility date", () => {
    const r = calcPregnancy(
      { parent: mother([{ title: "dzialalnosc", sickness: "dobrowolne", from: "2026-01-01" }]), base: 4000, codeB: true, ...SIXTY },
      params,
    );
    expect(r.periods[0].from).toBe("2026-04-01");
    expect(r.periods[0].days).toBe(29);
  });

  it("without code B → 80%", () => {
    const r = calcPregnancy({ parent: employee(), base: BASE, codeB: false, ...SIXTY }, params);
    expect(r.periods.every((x) => x.rate === 0.8)).toBe(true);
    expect(r.periods[0].monthlyAmount).toBe(4832.24);
    expect(r.reasons.join(" ")).toContain("kod „B”");
  });

  it("over 270 days → truncated + rehabilitation benefit info", () => {
    const r = calcPregnancy(
      { parent: employee(), base: BASE, codeB: true, illnessFrom: "2026-01-01", illnessTo: "2026-12-31" },
      params,
    );
    expect(r.daysUsed).toBe(270);
    expect(r.daysLeft).toBe(0);
    expect(r.periods.reduce((s, x) => s + x.days, 0)).toBe(270);
    expect(r.info.join(" ")).toContain("świadczenie rehabilitacyjne");
  });

  it("employer liquidated during pregnancy → benefit equal to maternity until birth", () => {
    const r = calcPregnancy(
      {
        parent: mother([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2022-01-01", to: "2026-04-30", terminationReason: "likwidacja" }]),
        base: BASE,
        codeB: true,
        illnessFrom: "2026-05-10",
        illnessTo: "2026-08-31",
        dueDate: "2026-08-15",
      },
      params,
    );
    expect(r.eligible).toBe(true);
    expect(r.periods.map((x) => [x.type, x.from, x.to, x.rate, x.payer])).toEqual([
      ["zasilek_wys_macierzynskiego", "2026-05-01", "2026-08-14", 1, "ZUS"],
    ]);
    expect(r.reasons[0]).toContain("likwidacji");
  });

  it("illness arising within 14 days after insurance ended → benefit from ZUS", () => {
    const r = calcPregnancy(
      {
        parent: mother([{ title: "zlecenie", sickness: "dobrowolne", from: "2025-01-01", to: "2026-02-20" }]),
        base: 3000,
        codeB: true,
        ...SIXTY,
      },
      params,
    );
    expect(r.eligible).toBe(true);
    expect(r.periods[0].payer).toBe("ZUS");
  });

  it("no insurance at all → no right", () => {
    const r = calcPregnancy({ parent: mother([]), base: 0, codeB: true, ...SIXTY }, params);
    expect(r.eligible).toBe(false);
  });

  it("illness until birth → stops the day before the due date", () => {
    const r = calcPregnancy(
      { parent: employee(), base: BASE, codeB: true, illnessFrom: "2026-03-01", illnessTo: "2026-06-30", dueDate: "2026-04-15" },
      params,
    );
    expect(r.periods.at(-1)!.to).toBe("2026-04-14");
    expect(r.info[0]).toContain("zasiłek macierzyński");
  });
});
