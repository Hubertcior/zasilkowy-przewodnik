import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { calculateAll } from "@/engine/calculate";
import { buildFilingGuide } from "@/engine/filing";
import { ParamsSchema } from "@/engine/params";
import type { InsurancePeriod, LeavePlan, ParentData, Scenario } from "@/engine/types";

const params = ParamsSchema.parse(defaults);
const birth: Scenario = { kind: "urodzenie", birthDate: "2026-06-10", children: 1, zaZyciem: false };

function guide(periods: InsurancePeriod[], scenario: Scenario = birth, extraParents: ParentData[] = [], plan?: LeavePlan) {
  const parents: ParentData[] = [{ role: "matka", periods, incomes: [], contractSalary: 6000 }, ...extraParents];
  const r = calculateAll({ parents, scenario, plan, baseOverride: { matka: 5000, ojciec: 6000 } }, params);
  return buildFilingGuide({ parents, scenario, eligibility: r.eligibility, entitlement: r.entitlement, schedule: r.schedule, plan: r.plan }, params);
}
const step = (steps: ReturnType<typeof guide>, id: string) => steps.find((s) => s.id === id);

describe("buildFilingGuide", () => {
  it("employee at a large employer → application to the employer, no Z-3", () => {
    const s = guide([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01", payerInsuredCount: 50 }]);
    const main = step(s, "wniosek-macierzynski-matka")!;
    expect(main.where).toBe("pracodawca");
    expect(main.deadline).toBe("2026-07-01");
    expect(step(s, "zaswiadczenie-platnika-matka")).toBeUndefined();
    expect(step(s, "macierzynski-przed-porodem")).toBeUndefined(); // already born
    expect(s.every((x) => x.source)).toBe(true);
  });

  it("JDG → ZAM directly to ZUS", () => {
    const s = guide([{ title: "dzialalnosc", sickness: "dobrowolne", from: "2020-01-01" }]);
    const main = step(s, "wniosek-macierzynski-matka")!;
    expect(main.where).toBe("ZUS");
    expect(main.forms[0]).toContain("ZAM");
    expect(main.online.channel).toBe("PUE/eZUS");
  });

  it("zlecenie at a small payer → ZUS + Z-3a from the client", () => {
    const s = guide([{ title: "zlecenie", sickness: "dobrowolne", from: "2020-01-01", payerInsuredCount: 5 }]);
    expect(step(s, "wniosek-macierzynski-matka")!.where).toBe("ZUS");
    const cert = step(s, "zaswiadczenie-platnika-matka")!;
    expect(cert.forms).toEqual(["Z-3a"]);
    expect(cert.who).toBe("zleceniodawca");
  });

  it("three titles give three different filing paths", () => {
    const wheres = [
      guide([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01", payerInsuredCount: 50 }]),
      guide([{ title: "dzialalnosc", sickness: "dobrowolne", from: "2020-01-01" }]),
      guide([{ title: "zlecenie", sickness: "dobrowolne", from: "2020-01-01", payerInsuredCount: 5 }]),
    ].map((s) => {
      const main = step(s, "wniosek-macierzynski-matka")!;
      const cert = step(s, "zaswiadczenie-platnika-matka");
      return `${main.where}|${main.forms[0]}|${cert?.forms.join(",") ?? "—"}`;
    });
    expect(new Set(wheres).size).toBe(3);
  });

  it("pregnancy: L4 step per title (JDG → ZAS-53) and maternity start date", () => {
    const s = guide([{ title: "dzialalnosc", sickness: "dobrowolne", from: "2020-01-01" }], { kind: "ciaza", dueDate: "2027-03-10" });
    expect(step(s, "l4-ciaza")!.forms).toContain("ZAS-53");
    expect(step(s, "macierzynski-przed-porodem")!.deadline).toBe("2027-01-27");
  });

  it("father: parental, paternity and take-over steps with deadlines", () => {
    const father: ParentData = { role: "ojciec", periods: [{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2018-01-01", payerInsuredCount: 30 }], incomes: [] };
    const s = guide(
      [{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01", payerInsuredCount: 50 }],
      birth,
      [father],
      { longApplication: false, fatherTakesOverFromWeek: 14, parental: [{ parent: "ojciec", weeks: 9 }], paternityWeeks: 2, paternityStartWeek: 1 },
    );
    expect(step(s, "przejecie-macierzynskiego")!.deadline).toBe("2026-09-09");
    expect(step(s, "ojcowski")!.deadline).toBe("2026-06-10");
    expect(step(s, "rodzicielski-ojciec")!.deadline).toBeDefined();
    expect(step(s, "odpis-aktu-urodzenia")!.deadline).toBe("2026-07-01");
  });

  it("premature baby → supplementary leave step; adoption → court documents; no insurance → no maternity step", () => {
    const pm = guide([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01", payerInsuredCount: 50 }], {
      ...birth,
      prematurity: { gestationWeek: 30, birthWeightG: 1400, hospitalWeeks: 5 },
    } as Scenario);
    expect(step(pm, "uzupelniajacy")!.attachments[0]).toContain("szpitala");
    const ad = guide([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01" }], { kind: "adopcja", acceptDate: "2026-06-10", children: 1, childAges: [2] });
    expect(step(ad, "dokumenty-adopcja")).toBeDefined();
    expect(step(ad, "odpis-aktu-urodzenia")).toBeUndefined();
    const none = guide([{ title: "dzialalnosc", sickness: "brak", from: "2020-01-01" }]);
    expect(step(none, "wniosek-macierzynski-matka")).toBeUndefined();
  });

  it("steps are sorted by deadline", () => {
    const s = guide([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01", payerInsuredCount: 50 }]);
    const dated = s.filter((x) => x.deadline).map((x) => x.deadline!);
    expect([...dated].sort()).toEqual(dated);
  });
});
