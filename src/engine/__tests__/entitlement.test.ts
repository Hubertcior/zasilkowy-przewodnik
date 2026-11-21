import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { calcEntitlement } from "@/engine/entitlement";
import { ParamsSchema } from "@/engine/params";
import type { Prematurity, Scenario } from "@/engine/types";

const params = ParamsSchema.parse(defaults);

const born = (extra: Partial<Extract<Scenario, { kind: "urodzenie" }>> = {}): Scenario => ({
  kind: "urodzenie",
  birthDate: "2026-06-10",
  children: 1,
  zaZyciem: false,
  ...extra,
});
const premature = (pm: Prematurity) => calcEntitlement(born({ prematurity: pm }), params).supplementaryWeeks;

describe("calcEntitlement – birth", () => {
  it("1 child → 20 / 41", () => {
    const e = calcEntitlement(born(), params);
    expect([e.maternityWeeks, e.parentalWeeks]).toEqual([20, 41]);
    expect(e.obligatoryMotherWeeks).toBe(14);
    expect(e.maxBeforeBirthWeeks).toBe(6);
    expect(e.nonTransferablePerParent).toBe(9);
    expect(e.paternityWeeks).toBe(2);
    expect(e.paternityDeadline).toBe("2027-06-10");
    expect(e.parentalDeadline).toBe("2032-12-31");
    expect(e.notes[0]).toContain("20 tygodni");
  });

  it("twins → 31 / 43", () => {
    const e = calcEntitlement(born({ children: 2 }), params);
    expect([e.maternityWeeks, e.parentalWeeks, e.paternityWeeks]).toEqual([31, 43, 2]);
  });

  it("1 child „Za życiem” → 20 / 65", () => {
    const e = calcEntitlement(born({ zaZyciem: true }), params);
    expect([e.maternityWeeks, e.parentalWeeks]).toEqual([20, 65]);
  });

  it("triplets „Za życiem” → 33 / 67", () => {
    const e = calcEntitlement(born({ children: 3, zaZyciem: true }), params);
    expect([e.maternityWeeks, e.parentalWeeks]).toEqual([33, 67]);
  });

  it("6 children → capped at 37", () => {
    expect(calcEntitlement(born({ children: 6 }), params).maternityWeeks).toBe(37);
  });
});

describe("calcEntitlement – supplementary leave", () => {
  it("26th week, 10 weeks in hospital → 10", () => {
    expect(premature({ gestationWeek: 26, birthWeightG: 900, hospitalWeeks: 10 })).toBe(10);
  });
  it("26th week, 18 weeks → 15 (cap)", () => {
    expect(premature({ gestationWeek: 26, birthWeightG: 900, hospitalWeeks: 18 })).toBe(15);
  });
  it("33rd week, 1500 g, 5.5 weeks → 6 (partial week rounded up)", () => {
    expect(premature({ gestationWeek: 33, birthWeightG: 1500, hospitalWeeks: 5.5 })).toBe(6);
  });
  it("33rd week, 12 weeks → 8 (cap)", () => {
    expect(premature({ gestationWeek: 33, birthWeightG: 1500, hospitalWeeks: 12 })).toBe(8);
  });
  it("weight ≤ 1000 g at 30th week → extreme category (cap 15)", () => {
    expect(premature({ gestationWeek: 30, birthWeightG: 950, hospitalWeeks: 12 })).toBe(12);
  });
  it("at term, 2 days in hospital from day 6 → 1", () => {
    expect(premature({ gestationWeek: 39, birthWeightG: 3400, hospitalWeeks: 2 / 7, hospitalStartDay: 6 })).toBe(1);
  });
  it("at term, hospital from day 3 → 0", () => {
    const e = calcEntitlement(born({ prematurity: { gestationWeek: 39, birthWeightG: 3400, hospitalWeeks: 1, hospitalStartDay: 3 } }), params);
    expect(e.supplementaryWeeks).toBe(0);
    expect(e.notes.join(" ")).toContain("nie przysługuje");
  });
});

describe("calcEntitlement – adoption / foster care", () => {
  it("adoption of a 3-year-old → maternity-like leave, at least 9 weeks", () => {
    const e = calcEntitlement({ kind: "adopcja", acceptDate: "2026-06-10", children: 1, childAges: [3] }, params);
    expect(e.eligible).toBe(true);
    expect(e.maternityKind).toBe("na_warunkach_macierzynskiego");
    expect(e.maternityWeeks).toBeGreaterThanOrEqual(9);
    expect(e.maternityWeeks).toBe(20);
    expect(e.obligatoryMotherWeeks).toBe(0);
    expect(e.parentalWeeks).toBe(41);
    expect(e.paternityWeeks).toBe(2);
    expect(e.paternityDeadline).toBe("2027-06-10");
  });

  it("foster care of an 8-year-old without postponed school → nothing", () => {
    const e = calcEntitlement({ kind: "piecza", acceptDate: "2026-06-10", children: 1, childAges: [8] }, params);
    expect(e.eligible).toBe(false);
    expect(e.maternityWeeks).toBe(0);
    expect(e.notes[0]).toContain("mniej niż 7 lat");
  });

  it("foster care of an 8-year-old with postponed school → eligible", () => {
    const e = calcEntitlement({ kind: "piecza", acceptDate: "2026-06-10", children: 1, childAges: [8], postponedSchool: true }, params);
    expect(e.eligible).toBe(true);
    expect(e.paternityWeeks).toBe(0);
  });

  it("adoption of siblings 2 and 15 → only the younger counts", () => {
    const e = calcEntitlement({ kind: "adopcja", acceptDate: "2026-06-10", children: 2, childAges: [2, 15] }, params);
    expect(e.maternityWeeks).toBe(20);
    expect(e.parentalWeeks).toBe(41);
  });
});

describe("calcEntitlement – child death", () => {
  it("death in 3rd week → 8 weeks after birth", () => {
    const e = calcEntitlement(born({ childDeath: { date: "2026-06-27" } }), params);
    expect(e.maternityWeeks).toBe(8);
    expect(e.maternityEndDate).toBe("2026-08-05");
    expect(e.parentalWeeks).toBe(0);
    expect(e.childDeathRule).toContain("przed ukończeniem 8 tygodni");
  });

  it("death in 10th week → 7 days after death", () => {
    const e = calcEntitlement(born({ childDeath: { date: "2026-08-15" } }), params);
    expect(e.maternityEndDate).toBe("2026-08-22");
    expect(e.childDeathRule).toContain("7 dniach");
  });

  it("death at day 54 → at least 7 days after death (beyond 8 weeks)", () => {
    const e = calcEntitlement(born({ childDeath: { date: "2026-08-03" } }), params);
    expect(e.maternityEndDate).toBe("2026-08-10");
  });

  it("stillbirth → 8 weeks", () => {
    expect(calcEntitlement(born({ stillbirth: true }), params).maternityWeeks).toBe(8);
  });

  it("twins, one dies → leave as for 1 child", () => {
    const e = calcEntitlement(born({ children: 2, childDeath: { date: "2026-06-20" } }), params);
    expect([e.maternityWeeks, e.parentalWeeks]).toEqual([20, 41]);
  });
});
