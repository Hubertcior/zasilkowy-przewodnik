import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { calculateAll } from "@/engine/calculate";
import { ParamsSchema } from "@/engine/params";
import { CalculateRequestSchema } from "@/engine/schemas";
import { emptyWizard, monthsBefore, WizardSchema, wizardToCase, type WizardForm } from "@/lib/wizard";

const params = ParamsSchema.parse(defaults);
const TODAY = "2026-11-21";

function wizard(patch: (w: WizardForm) => void): WizardForm {
  const w = emptyWizard();
  patch(w);
  return w;
}

describe("wizard", () => {
  it("monthsBefore returns 12 months before the reference month", () => {
    expect(monthsBefore("2026-03-10")).toEqual([
      "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02",
    ]);
  });

  it("validation blocks missing data", () => {
    const r = WizardSchema.safeParse(emptyWizard());
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toContain("dueDate");
    expect(paths).toContain("mother.from");
    expect(paths).toContain("mother.avgGross");
  });

  it("pregnant employee, quick income → valid case; calculate gives base 6040.30", () => {
    const w = wizard((w) => {
      w.situation = "ciaza";
      w.dueDate = "2027-03-10";
      w.mother.from = "2020-01-01";
      w.mother.bigPayer = "tak";
      w.mother.avgGross = 7000;
    });
    expect(WizardSchema.safeParse(w).success).toBe(true);
    const c = wizardToCase(w, TODAY);
    expect(c.scenario).toEqual({ kind: "ciaza", dueDate: "2027-03-10" });
    expect(c.parents).toHaveLength(1);
    expect(c.parents[0].incomes).toHaveLength(12);
    expect(c.parents[0].periods[0].payerInsuredCount).toBe(21);
    const req = CalculateRequestSchema.parse({ ...c, today: TODAY });
    const r = calculateAll(req, params);
    expect(r.bases.matka?.base).toBe(6040.3);
    expect(r.eligibility.matka?.payer).toBe("platnik");
  });

  it("detailed income: month below half worked is excluded, bonuses mapped", () => {
    const w = wizard((w) => {
      w.situation = "urodzenie";
      w.birthDate = "2026-03-10";
      w.mother.from = "2020-01-01";
      w.mother.incomeMode = "szczegolowy";
      w.mother.months = Array.from({ length: 12 }, (_, i) => ({ gross: i === 5 ? 1000 : 7000, half: i !== 5 }));
      w.mother.annualBonus = 12000;
      w.mother.quarterlyBonuses = 4800;
    });
    expect(WizardSchema.safeParse(w).success).toBe(true);
    const c = wizardToCase(w, TODAY);
    expect(c.parents[0].incomes.filter((m) => m.workedHalfOrMore === false)).toHaveLength(1);
    expect(c.parents[0].bonuses).toHaveLength(5);
    const r = calculateAll(CalculateRequestSchema.parse(c), params);
    // (7000 + 400 + 1000) × 0.8629
    expect(r.bases.matka?.base).toBe(7248.36);
  });

  it("JDG with declared base and debt, father included", () => {
    const w = wizard((w) => {
      w.situation = "urodzenie";
      w.birthDate = "2026-05-04";
      w.mother.title = "dzialalnosc";
      w.mother.sickness = "dobrowolne";
      w.mother.from = "2023-01-01";
      w.mother.declaredBase = 5000;
      w.mother.debt = 300;
      w.fatherSkip = false;
      w.father.from = "2018-01-01";
      w.father.avgGross = 8000;
    });
    expect(WizardSchema.safeParse(w).success).toBe(true);
    const c = wizardToCase(w, TODAY);
    expect(c.parents.map((p) => p.role)).toEqual(["matka", "ojciec"]);
    expect(c.parents[0].contributionDebt).toBe(300);
    const r = calculateAll(CalculateRequestSchema.parse(c), params);
    expect(r.bases.matka?.base).toBe(4314.5);
    expect(r.bases.ojciec?.base).toBe(6903.2);
  });

  it("premature twins with child death, adoption and foster care scenarios", () => {
    const born = wizardToCase(
      wizard((w) => {
        w.situation = "urodzenie";
        w.birthDate = "2026-05-01";
        w.children = 2;
        w.premature = true;
        w.gestationWeek = 30;
        w.birthWeightG = 1400;
        w.hospitalWeeks = 5;
        w.childDeath = true;
        w.childDeathDate = "2026-05-10";
        w.mother.title = "brak";
      }),
      TODAY,
    );
    expect(born.scenario).toMatchObject({ kind: "urodzenie", children: 2, prematurity: { gestationWeek: 30 }, childDeath: { date: "2026-05-10" } });
    expect(born.parents[0].periods).toEqual([]);

    const adoption = wizardToCase(wizard((w) => { w.situation = "adopcja"; w.acceptDate = "2026-06-01"; w.childAges = "2, 5"; }), TODAY);
    expect(adoption.scenario).toEqual({ kind: "adopcja", acceptDate: "2026-06-01", children: 2, childAges: [2, 5] });

    const foster = wizardToCase(wizard((w) => { w.situation = "piecza"; w.acceptDate = "2026-06-01"; w.childAges = "8"; w.postponedSchool = true; }), TODAY);
    expect(foster.scenario).toMatchObject({ kind: "piecza", postponedSchool: true });
  });

  it("planning → pregnancy scenario 9 months from today", () => {
    const c = wizardToCase(wizard((w) => { w.situation = "planuje"; }), TODAY);
    expect(c.scenario).toEqual({ kind: "ciaza", dueDate: "2027-08-21" });
  });

  it("invalid ages and dates are rejected", () => {
    const r = WizardSchema.safeParse(wizard((w) => { w.situation = "adopcja"; w.acceptDate = "2026-06-01"; w.childAges = "dwa"; }));
    expect(r.error!.issues.map((i) => i.path.join("."))).toContain("childAges");
    const r2 = WizardSchema.safeParse(wizard((w) => { w.mother.from = "2026-05-01"; w.mother.to = "2026-01-01"; }));
    expect(r2.error!.issues.map((i) => i.path.join("."))).toContain("mother.to");
  });
});
