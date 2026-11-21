import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { LINK_GROUPS } from "@/data/links";
import { ORGANIZATIONS, organizationsFor } from "@/data/organizations";
import { calculateAll } from "@/engine/calculate";
import { calcEntitlement, ENTITLEMENT_SOURCES } from "@/engine/entitlement";
import type { ParentData } from "@/engine/types";
import { ParamsSchema } from "@/engine/params";
import { CALC_PRESETS, presetScenario, type CalcScenario } from "@/lib/calc-presets";

const params = ParamsSchema.parse(defaults);

describe("organizations data", () => {
  it("6–10 verified non-profits with KRS, https URL and verification date", () => {
    expect(ORGANIZATIONS.length).toBeGreaterThanOrEqual(6);
    expect(ORGANIZATIONS.length).toBeLessThanOrEqual(10);
    for (const o of ORGANIZATIONS) {
      expect(o.krs).toMatch(/^\d{10}$/);
      expect(o.url).toMatch(/^https:\/\//);
      expect(o.krsSource).toMatch(/^https:\/\//);
      expect(o.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["fundacja", "stowarzyszenie"]).toContain(o.legalForm);
    }
    expect(new Set(ORGANIZATIONS.map((o) => o.krs)).size).toBe(ORGANIZATIONS.length);
  });

  it("each difficult situation except job loss has at least one organisation", () => {
    for (const s of ["strata", "wczesniak", "ciezko-chore", "matka"] as const) expect(organizationsFor(s).length).toBeGreaterThan(0);
  });
});

describe("useful links", () => {
  it("contain the links required by the ZUS task, all https", () => {
    const urls = LINK_GROUPS.flatMap((g) => g.links.map((l) => l.url));
    for (const u of urls) expect(u).toMatch(/^https:\/\//);
    expect(urls).toContain("https://www.gov.pl/web/rodzina/urlop-rodzicielski");
    expect(urls).toContain("https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo");
    expect(urls).toContain("https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego");
  });
});

describe("calculator presets", () => {
  const base: CalcScenario = { kind: "urodzenie", birthDate: "2026-11-01", children: 1, zaZyciem: false };
  it("map to engine scenarios", () => {
    expect(presetScenario("martwe-urodzenie", base, "2026-11-21")).toMatchObject({ stillbirth: true });
    expect(presetScenario("zgon-dziecka", base, "2026-11-21")).toMatchObject({ childDeath: { date: "2026-11-01" } });
    expect(presetScenario("wczesniak", base, "2026-11-21")).toMatchObject({ prematurity: { gestationWeek: 30 } });
    expect(presetScenario("za-zyciem", base, "2026-11-21")).toMatchObject({ zaZyciem: true });
    const fromAdoption = presetScenario("martwe-urodzenie", { kind: "adopcja", acceptDate: "2026-01-01", children: 1, childAges: [2] }, "2026-11-21");
    expect(fromAdoption).toMatchObject({ kind: "urodzenie", birthDate: "2026-11-21", stillbirth: true });
    expect(CALC_PRESETS).toHaveLength(6);
  });

  it("stillbirth preset gives 8 weeks of maternity leave and no parental leave (art. 180¹ KP)", () => {
    const sc = presetScenario("martwe-urodzenie", base, "2026-11-21");
    const ent = calcEntitlement(sc, params);
    expect(ent.maternityWeeks).toBe(8);
    expect(ent.parentalWeeks).toBe(0);
    expect(ENTITLEMENT_SOURCES.childDeath).toContain("180¹");
    expect(ENTITLEMENT_SOURCES.supplementary).toBe("art. 180² KP");
  });
});

describe("params", () => {
  it("funeral grant after stillbirth defaults to 7000 zł, also for older stored params", () => {
    expect(params.childDeath.funeralGrant).toBe(7000);
    const old = structuredClone(defaults) as { childDeath: Record<string, unknown> };
    delete old.childDeath.funeralGrant;
    expect(ParamsSchema.parse(old).childDeath.funeralGrant).toBe(7000);
  });
});

describe("stillbirth in the engine (regression found in KAN-31)", () => {
  const emp = (role: "matka" | "ojciec"): ParentData => ({
    role,
    periods: [{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2015-01-01", payerInsuredCount: 50 }],
    incomes: [],
  });
  const scenario = { kind: "urodzenie" as const, birthDate: "2026-11-01", children: 1, zaZyciem: false, stillbirth: true };
  const run = (plan?: Parameters<typeof calculateAll>[0]["plan"]) =>
    calculateAll({ parents: [emp("matka"), emp("ojciec")], scenario, plan, baseOverride: { matka: 6000, ojciec: 6000 }, today: "2026-11-21" }, params);

  it("default plan: 8 weeks of maternity at 100%, no paternity leave, no 81.5% comparison", () => {
    const r = run();
    expect(r.plan.longApplication).toBe(false);
    expect(r.schedule.periods.map((p) => p.type)).toEqual(["macierzynski"]);
    expect(r.schedule.periods[0]).toMatchObject({ days: 56, rate: 1 });
    expect(r.schedule.comparison).toBeUndefined();
  });

  it("even with longApplication and paternity requested: 100%, no paternity period", () => {
    const r = run({ longApplication: true, parental: [], paternityWeeks: 2 });
    expect(r.schedule.periods[0].rate).toBe(1);
    expect(r.schedule.periods.some((p) => p.type === "ojcowski")).toBe(false);
  });

  it("no warnings about the 21-day application, father's 9 weeks or paternity deadline", () => {
    const ids = run().warnings.map((w) => w.id);
    expect(ids).not.toContain("termin-21-dni");
    expect(ids).not.toContain("niewykorzystane-9-tygodni");
    expect(ids).not.toContain("ojcowski-12-miesiecy");
  });
});
