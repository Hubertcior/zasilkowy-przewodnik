import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import defaults from "@/config/params.default.json";
import { POST as login } from "@/app/api/mock/mobywatel/login/route";
import { POST as logout } from "@/app/api/mock/mobywatel/logout/route";
import { GET as ezla } from "@/app/api/mock/zus/ezla/route";
import { GET as profile } from "@/app/api/mock/zus/profile/route";
import { GET as debt } from "@/app/api/mock/zus/zadluzenie/route";
import { calculateAll } from "@/engine/calculate";
import { ParamsSchema } from "@/engine/params";
import { CalculateRequestSchema } from "@/engine/schemas";
import { buildPersonas, getPersona } from "@/server/mocks/personas";
import { MemoryParamsStore, setParamsStore } from "@/server/paramsStore";

vi.mock("next/server", () => ({ connection: async () => {} }));

const params = ParamsSchema.parse(defaults);
const TODAY = "2026-11-21";

describe("personas", () => {
  const personas = buildPersonas(TODAY);

  it("6 personas with unique ids", () => {
    expect(personas.map((p) => p.id)).toEqual(["anna", "kasia", "ola", "marta", "ewa-piotr", "magda"]);
  });

  it.each(buildPersonas(TODAY).map((p) => [p.id, p] as const))("%s: data passes API schema and /api/calculate logic", (_id, p) => {
    const req = CalculateRequestSchema.parse({ parents: p.parents, scenario: p.scenario, today: TODAY });
    const r = calculateAll(req, params);
    expect(r.entitlement).toBeDefined();
    expect(r.schedule.periods).toBeDefined();
  });

  it("expected outcomes per persona", () => {
    const calc = (id: string) => {
      const p = getPersona(id, TODAY)!;
      return calculateAll({ parents: p.parents, scenario: p.scenario, today: TODAY }, params);
    };
    const anna = calc("anna");
    expect(anna.eligibility.matka?.payer).toBe("platnik");
    expect(anna.bases.matka?.base).toBe(6040.3);
    expect(calc("kasia").eligibility.matka?.maternityEligible).toBe(true);
    expect(calc("kasia").bases.matka?.base).toBe(4314.5);
    const ola = calc("ola");
    expect(ola.eligibility.matka?.maternityEligible).toBe(false);
    expect(ola.warnings.map((w) => w.id)).toContain("brak-dobrowolnego-chorobowego");
    const marta = calc("marta");
    expect(marta.eligibility.matka?.payer).toBe("ZUS");
    expect(marta.entitlement.supplementaryWeeks).toBe(5);
    const adoption = calc("ewa-piotr");
    expect(adoption.entitlement.maternityKind).toBe("na_warunkach_macierzynskiego");
    expect(adoption.eligibility.ojciec?.maternityEligible).toBe(true);
    expect(calc("magda").eligibility.matka?.maternityEligible).toBe(true);
  });
});

describe("mObywatel / ZUS mocks", () => {
  beforeEach(() => setParamsStore(new MemoryParamsStore()));
  afterEach(() => setParamsStore(undefined));

  const withCookie = (cookie: string, url = "http://localhost/api") => new Request(url, { headers: { cookie } });

  it("login sets an httpOnly cookie; profile/ezla/debt read it", async () => {
    const res = await login(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ personaId: "anna" }) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ token: "anna", name: "Anna Kowalczyk" });
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain("HttpOnly");
    const cookie = setCookie.split(";")[0];

    const prof = await (await profile(withCookie(cookie))).json();
    expect(prof.persona.id).toBe("anna");
    expect(prof.parents).toHaveLength(2);

    const e = await (await ezla(withCookie(cookie))).json();
    expect(e.ezla.every((x: { code: string }) => x.code === "B")).toBe(true);

    const d = await (await debt(withCookie(cookie, "http://localhost/api?date=2026-11-01"))).json();
    expect(d).toMatchObject({ date: "2026-11-01", amount: 0 });
  });

  it("no session → 401; unknown persona → 404; logout clears cookie", async () => {
    expect((await profile(new Request("http://localhost/api"))).status).toBe(401);
    const res = await login(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ personaId: "nobody" }) }));
    expect(res.status).toBe(404);
    const out = await logout();
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
