import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { calcEntitlement } from "@/engine/entitlement";
import { ParamsSchema } from "@/engine/params";
import { buildSchedule, type ScheduleParent } from "@/engine/schedule";
import type { LeavePlan, ParentData, Scenario } from "@/engine/types";

const params = ParamsSchema.parse(defaults);

const employee = (role: "matka" | "ojciec"): ParentData => ({
  role,
  periods: [{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01", payerInsuredCount: 50 }],
  incomes: [],
});
const mother: ScheduleParent = { data: employee("matka"), base: 6040.3, payer: "platnik", eligible: true };
const father: ScheduleParent = { data: employee("ojciec"), base: 5000, payer: "ZUS", eligible: true };

const born = (children = 1): Scenario => ({ kind: "urodzenie", birthDate: "2026-06-01", children, zaZyciem: false });

function run(plan: LeavePlan, scenario = born()) {
  return buildSchedule({ scenario, mother, father, plan }, calcEntitlement(scenario, params), params);
}

const FULL: LeavePlan = {
  longApplication: true,
  parental: [
    { parent: "matka", weeks: 32 },
    { parent: "ojciec", weeks: 9 },
  ],
};

describe("buildSchedule", () => {
  it("long application, father 9 weeks: mother 81.5% (4922.84/month) for 20 + 32 weeks, father 70%", () => {
    const r = run(FULL);
    expect(r.validation).toEqual({ ok: true, errors: [] });
    const m = r.periods.filter((x) => x.parent === "matka");
    expect(m.map((x) => [x.type, x.days, x.monthlyAmount])).toEqual([
      ["macierzynski", 140, 4922.84],
      ["rodzicielski", 224, 4922.84],
    ]);
    const f = r.periods.filter((x) => x.parent === "ojciec");
    expect(f.map((x) => [x.type, x.days, x.rate, x.monthlyAmount, x.payer])).toEqual([["rodzicielski", 63, 0.7, 3500, "ZUS"]]);
    expect(m[0].from).toBe("2026-06-01");
    expect(m[0].to).toBe("2026-10-18");
    expect(m[1].from).toBe("2026-10-19");
    expect(f[0].from).toBe("2027-05-31");
    // 140 days × 4922.84 / 30
    expect(m[0].total).toBe(22973.25);
  });

  it("without long application: 6040.30 for 20 weeks, then 4228.21", () => {
    const r = run({ ...FULL, longApplication: false });
    const m = r.periods.filter((x) => x.parent === "matka");
    expect(m.map((x) => x.monthlyAmount)).toEqual([6040.3, 4228.21]);
  });

  it("difference between variants < 0.2% for the full leave", () => {
    const { comparison } = run(FULL);
    expect(comparison).toBeDefined();
    expect(Math.abs(comparison!.difference) / comparison!.separate).toBeLessThan(0.002);
  });

  it("twins: 31 + 43 weeks", () => {
    const r = run(
      { longApplication: false, parental: [{ parent: "matka", weeks: 34 }, { parent: "ojciec", weeks: 9 }] },
      born(2),
    );
    expect(r.validation.ok).toBe(true);
    expect(r.periods.find((x) => x.type === "macierzynski")!.days).toBe(31 * 7);
    const parental = r.periods.filter((x) => x.type === "rodzicielski").reduce((s, x) => s + x.days, 0);
    expect(parental).toBe(43 * 7);
  });

  it("mother returns after 14 weeks, father takes over 6 weeks of maternity", () => {
    const r = run({ longApplication: false, fatherTakesOverFromWeek: 14, parental: [] });
    expect(r.validation.ok).toBe(true);
    const mat = r.periods.filter((x) => x.type === "macierzynski");
    expect(mat.map((x) => [x.parent, x.days])).toEqual([
      ["matka", 98],
      ["ojciec", 42],
    ]);
    expect(mat[1].from).toBe("2026-09-07");
    expect(mat[1].monthlyAmount).toBe(5000);
  });

  it("take-over before 14 weeks needs a special reason", () => {
    expect(run({ longApplication: false, fatherTakesOverFromWeek: 8, parental: [] }).validation.ok).toBe(false);
    const ok = run({ longApplication: false, fatherTakesOverFromWeek: 8, specialTakeOver: "szpital", parental: [] });
    expect(ok.validation.ok).toBe(true);
    expect(ok.notes.join(" ")).toContain("sytuacji szczególnej");
  });

  it("combining work: 16 weeks of parental at 1/2 time → 32 weeks, half benefit", () => {
    const r = run({ longApplication: false, parental: [{ parent: "matka", weeks: 16, workFraction: 0.5 }] });
    const p = r.periods.find((x) => x.type === "rodzicielski")!;
    expect(p.days).toBe(32 * 7);
    expect(p.workFraction).toBe(0.5);
    expect(p.monthlyAmount).toBe(2114.11); // 6040.30 × 70% × 0.5
    expect(r.validation.ok).toBe(true);
  });

  it("paternity leave 2 weeks at 100%", () => {
    const r = run({ longApplication: true, parental: [], paternityWeeks: 2 });
    const p = r.periods.find((x) => x.type === "ojcowski")!;
    expect([p.parent, p.days, p.rate, p.monthlyAmount, p.from]).toEqual(["ojciec", 14, 1, 5000, "2026-06-01"]);
    expect(p.total).toBe(2333.33);
  });

  it("validation: 6 parts → error", () => {
    const r = run({
      longApplication: false,
      parental: [
        { parent: "matka", weeks: 5 },
        { parent: "ojciec", weeks: 5 },
        { parent: "matka", weeks: 5 },
        { parent: "ojciec", weeks: 5 },
        { parent: "matka", weeks: 5 },
        { parent: "ojciec", weeks: 5 },
      ],
    });
    expect(r.validation.ok).toBe(false);
    expect(r.validation.errors.join(" ")).toContain("maks. 5 części");
  });

  it("validation: mother takes father's 9 weeks, workFraction > 0.5, paternity too late", () => {
    const r = run({
      longApplication: false,
      parental: [{ parent: "matka", weeks: 41, workFraction: 0.6 }],
      paternityWeeks: 2,
      paternityStartWeek: 60,
    });
    const msg = r.validation.errors.join(" ");
    expect(msg).toContain("wyłącznie drugiemu rodzicowi");
    expect(msg).toContain("maks. 0.5 etatu");
    expect(msg).toContain("Urlop ojcowski trzeba wykorzystać");
  });

  it("long application: father beyond 9 weeks gets 81.5% for the rest", () => {
    const r = run({ longApplication: true, parental: [{ parent: "matka", weeks: 20 }, { parent: "ojciec", weeks: 21 }] });
    const f = r.periods.filter((x) => x.parent === "ojciec" && x.type === "rodzicielski");
    expect(f.map((x) => [x.days, x.rate])).toEqual([
      [63, 0.7],
      [84, 0.815],
    ]);
  });

  it("ineligible mother: father can still get parental benefit", () => {
    const r = buildSchedule(
      { scenario: born(), mother: { ...mother, eligible: false }, father, plan: { longApplication: false, parental: [{ parent: "ojciec", weeks: 32 }] } },
      calcEntitlement(born(), params),
      params,
    );
    expect(r.periods.every((x) => x.parent === "ojciec")).toBe(true);
    expect(r.totals.matka).toBe(0);
  });

  it("monthly cash flow sums to totals", () => {
    const r = run(FULL);
    const sum = r.monthly.reduce((s, m) => s + m.matka + m.ojciec, 0);
    expect(Math.abs(sum - r.totals.razem)).toBeLessThan(0.1);
    expect(r.monthly[0].month).toBe("2026-06");
  });
});
