import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as calculate } from "@/app/api/calculate/route";
import { GET as getCase } from "@/app/api/cases/[id]/route";
import { GET as listCases } from "@/app/api/cases/route";
import { POST as eligibility } from "@/app/api/eligibility/route";
import { POST as pueMessage } from "@/app/api/mock/pue/wiadomosc/route";
import { POST as pregnancy } from "@/app/api/pregnancy/route";
import { MemoryParamsStore, setParamsStore } from "@/server/paramsStore";

vi.mock("next/server", () => ({ connection: async () => {} }));

const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2025, 5 + i, 1)).toISOString().slice(0, 7));
const mother = {
  role: "matka",
  periods: [{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01", payerInsuredCount: 50 }],
  incomes: months.map((month) => ({ month, gross: 7000 })),
};
const father = { ...mother, role: "ojciec", incomes: months.map((month) => ({ month, gross: 8000 })) };
const scenario = { kind: "urodzenie", birthDate: "2026-06-10", children: 1, zaZyciem: false };

const post = (handler: (r: Request) => Promise<Response>, body: unknown) =>
  handler(new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("engine API", () => {
  beforeEach(() => setParamsStore(new MemoryParamsStore()));
  afterEach(() => setParamsStore(undefined));

  it("POST /api/calculate for 7000 zł → base 6040.30, schedule, warnings", async () => {
    const res = await post(calculate, { parents: [mother, father], scenario, today: "2026-06-12" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bases.matka.base).toBe(6040.3);
    expect(json.bases.matka.steps.length).toBeGreaterThan(2);
    expect(json.eligibility.matka.maternityEligible).toBe(true);
    expect(json.entitlement.maternityWeeks).toBe(20);
    expect(json.plan.longApplication).toBe(true);
    const first = json.schedule.periods[0];
    expect(first.type).toBe("macierzynski");
    expect(first.monthlyAmount).toBe(4922.84);
    expect(json.schedule.validation.ok).toBe(true);
    expect(json.warnings.map((w: { id: string }) => w.id)).toContain("termin-21-dni");
  });

  it("POST /api/calculate with baseOverride and explicit plan", async () => {
    const res = await post(calculate, {
      parents: [mother],
      scenario,
      baseOverride: { matka: 5000 },
      plan: { longApplication: false, parental: [{ parent: "matka", weeks: 32 }] },
    });
    const json = await res.json();
    expect(json.bases.matka.base).toBe(5000);
    expect(json.schedule.periods[0].monthlyAmount).toBe(5000);
  });

  it("POST /api/calculate with invalid body → 400 validation", async () => {
    const res = await post(calculate, { parents: [{ role: "kot" }], scenario: { kind: "x" } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("validation");
    expect(json.issues.length).toBeGreaterThan(0);
  });

  it("invalid JSON → 400", async () => {
    const res = await calculate(new Request("http://localhost/api", { method: "POST", body: "{nope" }));
    expect(res.status).toBe(400);
  });

  it("duplicate roles → 400", async () => {
    const res = await post(calculate, { parents: [mother, mother], scenario });
    expect(res.status).toBe(400);
  });

  it("POST /api/eligibility → result per parent", async () => {
    const res = await post(eligibility, { parents: [mother, father], scenario });
    const json = await res.json();
    expect(json.matka.payer).toBe("platnik");
    expect(json.ojciec.insuredOnDate).toBe(true);
  });

  it("POST /api/pregnancy computes base when omitted", async () => {
    const res = await post(pregnancy, { parent: mother, illnessFrom: "2026-06-01", illnessTo: "2026-07-30", codeB: true, dueDate: "2026-12-01" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.base.base).toBe(6040.3);
    expect(json.periods.map((p: { days: number }) => p.days)).toEqual([33, 27]);
    expect(Array.isArray(json.warnings)).toBe(true);
  });

  it("POST /api/pregnancy rejects illnessTo before illnessFrom", async () => {
    const res = await post(pregnancy, { parent: mother, illnessFrom: "2026-06-10", illnessTo: "2026-06-01", codeB: true });
    expect(res.status).toBe(400);
  });

  it("GET /api/cases → empty list; GET /api/cases/:id → 404", async () => {
    expect(await (await listCases()).json()).toEqual([]);
    const res = await getCase(new Request("http://localhost/api/cases/x"), { params: Promise.resolve({ id: "x" }) });
    expect(res.status).toBe(404);
  });

  it("mock endpoints return 501 with description", async () => {
    const res = await pueMessage();
    expect(res.status).toBe(501);
    expect((await res.json()).message).toContain("KAN-29");
  });
});
