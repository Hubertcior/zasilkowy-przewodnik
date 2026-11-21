import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { checkEligibility } from "@/engine/eligibility";
import { ParamsSchema } from "@/engine/params";
import type { LeavePlan, ParentData, Scenario } from "@/engine/types";
import { collectWarnings } from "@/engine/warnings";

const params = ParamsSchema.parse(defaults);
const pregnant: Scenario = { kind: "ciaza", dueDate: "2027-01-15" }; // pregnancy start ≈ 2026-04-10
const TODAY = "2026-11-21";

const employee = (extra: Partial<ParentData> = {}): ParentData => ({
  role: "matka",
  periods: [{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01", payerInsuredCount: 50 }],
  incomes: [],
  ...extra,
});

function warn(parents: ParentData[], scenario: Scenario = pregnant, plan?: LeavePlan, today = TODAY) {
  const eligibility = Object.fromEntries(parents.map((p) => [p.role, checkEligibility(p, scenario, params)]));
  return collectWarnings({ parents, scenario, plan, eligibility, today }, params);
}
const ids = (ws: { id: string }[]) => ws.map((w) => w.id);

describe("collectWarnings", () => {
  it("umowa-dla-pozoru: insurance started shortly before pregnancy, high base", () => {
    const m = employee({
      periods: [{ title: "dzialalnosc", sickness: "dobrowolne", from: "2026-03-01" }],
      declaredBase: [{ month: "2026-03", amount: 15000 }],
    });
    const w = warn([m]).find((x) => x.id === "umowa-dla-pozoru")!;
    expect(w.severity).toBe("warning");
    expect(w.text).toContain("z wysoką podstawą");
  });

  it("podwyzszenie-podstawy: declared base up > 30% in pregnancy", () => {
    const m = employee({
      periods: [{ title: "dzialalnosc", sickness: "dobrowolne", from: "2022-01-01" }],
      declaredBase: [
        { month: "2026-01", amount: 5000 },
        { month: "2026-02", amount: 5000 },
        { month: "2026-05", amount: 12000 },
      ],
    });
    expect(ids(warn([m]))).toContain("podwyzszenie-podstawy");
  });

  it("brak-ubezpieczenia-w-dniu-porodu: zlecenie ends before due date", () => {
    const m = employee({ periods: [{ title: "zlecenie", sickness: "dobrowolne", from: "2024-01-01", to: "2026-12-31" }] });
    const w = warn([m]);
    expect(w[0].id).toBe("brak-ubezpieczenia-w-dniu-porodu");
    expect(w[0].severity).toBe("critical");
    expect(w[0].text).toContain("2026-12-31");
  });

  it("fixed-term employment ending after 3rd month of pregnancy is extended (no critical, KP info)", () => {
    const m = employee({ periods: [{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2024-01-01", to: "2026-12-31" }] });
    const w = warn([m]);
    expect(ids(w)).not.toContain("brak-ubezpieczenia-w-dniu-porodu");
    expect(w.find((x) => x.id === "ochrona-kp")!.text).toContain("powinna zostać przedłużona");
  });

  it("brak-dobrowolnego-chorobowego: JDG without sickness insurance", () => {
    const m = employee({ periods: [{ title: "dzialalnosc", sickness: "brak", from: "2022-01-01" }] });
    const w = warn([m]).find((x) => x.id === "brak-dobrowolnego-chorobowego")!;
    expect(w.severity).toBe("critical");
  });

  it("okres-wyczekiwania: voluntary insurance started 30 days ago", () => {
    const m = employee({ periods: [{ title: "zlecenie", sickness: "dobrowolne", from: "2026-10-22" }] });
    const w = warn([m]).find((x) => x.id === "okres-wyczekiwania")!;
    expect(w.text).toContain("2027-01-20");
  });

  it("zadluzenie-skladkowe: critical with voluntary insurance", () => {
    const m = employee({ periods: [{ title: "dzialalnosc", sickness: "dobrowolne", from: "2022-01-01" }], contributionDebt: 820 });
    const w = warn([m]).find((x) => x.id === "zadluzenie-skladkowe")!;
    expect(w.severity).toBe("critical");
    expect(w.text).toContain("820,00");
  });

  it("termin-21-dni: info in pregnancy, warning close to the deadline after birth", () => {
    expect(warn([employee()]).find((x) => x.id === "termin-21-dni")!.severity).toBe("info");
    const born: Scenario = { kind: "urodzenie", birthDate: "2026-11-05", children: 1, zaZyciem: false };
    const w = warn([employee()], born).find((x) => x.id === "termin-21-dni")!;
    expect(w.severity).toBe("warning");
    expect(w.text).toContain("zostało 5 dni");
    expect(ids(warn([employee()], born, undefined, "2026-12-01"))).not.toContain("termin-21-dni");
  });

  it("niewykorzystane-9-tygodni and lacze-prace from the plan", () => {
    const plan: LeavePlan = { longApplication: true, parental: [{ parent: "matka", weeks: 32, workFraction: 0.5 }, { parent: "ojciec", weeks: 4 }] };
    const w = ids(warn([employee()], pregnant, plan));
    expect(w).toContain("niewykorzystane-9-tygodni");
    expect(w).toContain("lacze-prace");
  });

  it("ojcowski-12-miesiecy when father is present", () => {
    const father: ParentData = { ...employee(), role: "ojciec" };
    const w = warn([employee(), father]).find((x) => x.id === "ojcowski-12-miesiecy")!;
    expect(w.text).toContain("2028-01-15");
  });

  it("ochrona-kp only for employees", () => {
    expect(ids(warn([employee()]))).toContain("ochrona-kp");
    const jdg = employee({ periods: [{ title: "dzialalnosc", sickness: "dobrowolne", from: "2020-01-01" }] });
    expect(ids(warn([jdg]))).not.toContain("ochrona-kp");
  });

  it("zmiana-zatrudnienia-w-ciazy: pay change > 20% in pregnancy", () => {
    const m = employee({
      incomes: [
        { month: "2026-01", gross: 6000 },
        { month: "2026-02", gross: 6000 },
        { month: "2026-03", gross: 6000 },
        { month: "2026-06", gross: 9000 },
        { month: "2026-07", gross: 9000 },
      ],
    });
    expect(ids(warn([m]))).toContain("zmiana-zatrudnienia-w-ciazy");
  });

  it("sorted critical → warning → info", () => {
    const m = employee({
      periods: [{ title: "dzialalnosc", sickness: "dobrowolne", from: "2026-03-01", to: "2026-12-31" }],
      contributionDebt: 500,
    });
    const sev = warn([m]).map((x) => x.severity);
    const order = { critical: 0, warning: 1, info: 2 };
    expect(sev.length).toBeGreaterThan(2);
    expect([...sev].sort((a, b) => order[a] - order[b])).toEqual(sev);
    expect(sev[0]).toBe("critical");
  });

  it("every warning has a source", () => {
    const m = employee({ periods: [{ title: "dzialalnosc", sickness: "dobrowolne", from: "2026-03-01" }], contributionDebt: 1 });
    expect(warn([m]).every((x) => x.source && x.title && x.text)).toBe(true);
  });
});
