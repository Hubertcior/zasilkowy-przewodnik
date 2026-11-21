import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { checkEligibility } from "@/engine/eligibility";
import { ParamsSchema } from "@/engine/params";
import type { InsurancePeriod, ParentData, Scenario } from "@/engine/types";

const params = ParamsSchema.parse(defaults);
const birth: Scenario = { kind: "urodzenie", birthDate: "2026-06-10", children: 1, zaZyciem: false };

const mother = (periods: InsurancePeriod[], extra: Partial<ParentData> = {}): ParentData => ({
  role: "matka",
  periods,
  incomes: [],
  ...extra,
});

describe("checkEligibility", () => {
  it("employee at a large employer (25 insured) → payer pays", () => {
    const r = checkEligibility(
      mother([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2022-01-01", payerInsuredCount: 25, payerName: "Duża Sp. z o.o." }]),
      birth,
      params,
    );
    expect(r.insuredOnDate).toBe(true);
    expect(r.maternityEligible).toBe(true);
    expect(r.payer).toBe("platnik");
    expect(r.forms).not.toContain("Z-3");
    expect(r.attachments).toContain("Skrócony odpis aktu urodzenia dziecka");
    expect(r.reasons.join(" ")).toContain("więcej niż 20");
  });

  it("employee at a small employer (5) → ZUS + Z-3", () => {
    const r = checkEligibility(
      mother([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2022-01-01", payerInsuredCount: 5 }]),
      birth,
      params,
    );
    expect(r.payer).toBe("ZUS");
    expect(r.forms).toContain("Z-3");
    expect(r.whereToFile).toContain("Z-3");
  });

  it("zlecenie with voluntary sickness insurance → ZAM + Z-3a", () => {
    const r = checkEligibility(
      mother([{ title: "zlecenie", sickness: "dobrowolne", from: "2025-01-01", payerInsuredCount: 3 }]),
      birth,
      params,
    );
    expect(r.maternityEligible).toBe(true);
    expect(r.forms).toEqual(["ZAM", "Z-3a"]);
    expect(r.payer).toBe("ZUS");
  });

  it("zlecenie without sickness insurance → no right, with explanation", () => {
    const r = checkEligibility(mother([{ title: "zlecenie", sickness: "brak", from: "2025-01-01" }]), birth, params);
    expect(r.insuredOnDate).toBe(false);
    expect(r.maternityEligible).toBe(false);
    expect(r.forms).toEqual([]);
    expect(r.reasons.join(" ")).toContain("nie podlegasz ubezpieczeniu chorobowemu");
    expect(r.reasons.join(" ")).toContain("dobrowolne");
  });

  it("JDG with voluntary sickness insurance → ZUS, ZAM", () => {
    const r = checkEligibility(
      mother([{ title: "dzialalnosc", sickness: "dobrowolne", from: "2023-01-01" }], { contributionDebt: 350 }),
      birth,
      params,
    );
    expect(r.maternityEligible).toBe(true);
    expect(r.payer).toBe("ZUS");
    expect(r.forms).toEqual(["ZAM"]);
    expect(r.contributionDebt).toBe(350);
    expect(r.payerReason).toContain("zawsze wypłaca ZUS");
  });

  it("JDG without sickness insurance → no right", () => {
    const r = checkEligibility(mother([{ title: "dzialalnosc", sickness: "brak", from: "2023-01-01" }]), birth, params);
    expect(r.maternityEligible).toBe(false);
    expect(r.sicknessEligibleFrom).toBeUndefined();
  });

  it("contract ended before birth → not insured on the birth date", () => {
    const r = checkEligibility(
      mother([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2022-01-01", to: "2026-05-31", terminationReason: "inne" }]),
      birth,
      params,
    );
    expect(r.insuredOnDate).toBe(false);
    expect(r.maternityEligible).toBe(false);
    expect(r.reasons.join(" ")).toContain("zakończyła się 2026-05-31");
  });

  it("contract ended in pregnancy due to employer liquidation → maternity from ZUS", () => {
    const r = checkEligibility(
      mother([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2022-01-01", to: "2026-03-31", terminationReason: "likwidacja" }]),
      birth,
      params,
    );
    expect(r.insuredOnDate).toBe(false);
    expect(r.maternityEligible).toBe(true);
    expect(r.payer).toBe("ZUS");
    expect(r.forms).toEqual(["ZAM"]);
  });

  it("voluntary sickness insurance for 60 days → sicknessEligibleFrom after 90 days", () => {
    const r = checkEligibility(
      mother([{ title: "zlecenie", sickness: "dobrowolne", from: "2026-04-11" }]),
      { kind: "ciaza", dueDate: "2026-12-01" },
      params,
      "2026-06-10",
    );
    expect(r.insuredOnDate).toBe(true);
    expect(r.benefit).toBe("chorobowy");
    expect(r.sicknessEligibleFrom).toBe("2026-07-10");
    expect(r.forms).toContain("Z-3a");
    expect(r.forms[0]).toContain("e-ZLA");
  });

  it("mandatory insurance → 30 days; earlier period counts if break ≤ 30 days", () => {
    const r = checkEligibility(
      mother([
        { title: "umowa_o_prace", sickness: "obowiazkowe", from: "2025-01-01", to: "2026-03-31" },
        { title: "umowa_o_prace", sickness: "obowiazkowe", from: "2026-04-20", payerInsuredCount: 4 },
      ]),
      { kind: "ciaza", dueDate: "2026-12-01" },
      params,
      "2026-05-01",
    );
    expect(r.sicknessEligibleFrom).toBe("2025-01-31");
    expect(r.forms).toEqual(expect.arrayContaining(["Z-3", "ZAS-12"]));
  });

  it("break > 30 days → waiting period starts again", () => {
    const r = checkEligibility(
      mother([
        { title: "umowa_o_prace", sickness: "obowiazkowe", from: "2025-01-01", to: "2026-02-28" },
        { title: "umowa_o_prace", sickness: "obowiazkowe", from: "2026-04-20" },
      ]),
      { kind: "ciaza", dueDate: "2026-12-01" },
      params,
      "2026-05-01",
    );
    expect(r.sicknessEligibleFrom).toBe("2026-05-20");
  });

  it("adoption: court documents attached", () => {
    const r = checkEligibility(
      mother([{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2022-01-01", payerInsuredCount: 50 }]),
      { kind: "adopcja", acceptDate: "2026-06-10", children: 1, childAges: [3] },
      params,
    );
    expect(r.maternityEligible).toBe(true);
    expect(r.attachments[0]).toContain("przysposobieniu");
  });

  it("prefers sickness-insured employment over uninsured zlecenie on the same day", () => {
    const r = checkEligibility(
      mother([
        { title: "zlecenie", sickness: "brak", from: "2024-01-01" },
        { title: "umowa_o_prace", sickness: "obowiazkowe", from: "2024-01-01", payerInsuredCount: 30 },
      ]),
      birth,
      params,
    );
    expect(r.activePeriod?.title).toBe("umowa_o_prace");
    expect(r.maternityEligible).toBe(true);
  });
});
