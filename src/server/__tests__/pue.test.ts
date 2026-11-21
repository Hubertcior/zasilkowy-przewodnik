import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as listRoute, POST as postRoute } from "@/app/api/mock/pue/wiadomosc/route";
import { GET as debt } from "@/app/api/mock/zus/zadluzenie/route";
import { debtWarning } from "@/engine/warnings";
import { debtEntryOn, getPersona } from "@/server/mocks/personas";
import { answerFor, clearThreads, createThread, listThreads, PUE_ANSWER_DELAY_MS } from "@/server/mocks/pue";

vi.mock("next/server", () => ({ connection: async () => {} }));

const TODAY = "2026-11-21";
const req = (personaId: string, url = "http://localhost/api", init: RequestInit = {}) =>
  new Request(url, { ...init, headers: { cookie: `zp_session=${personaId}`, "content-type": "application/json" } });

describe("PUE „Zapytaj ZUS” templates", () => {
  afterEach(() => clearThreads());

  it("answers by keyword, falls back to the category default, always marks the answer as simulated", () => {
    expect(answerFor("macierzynski", "Czy przy zadłużeniu składkowym dostanę zasiłek?")).toContain("art. 14 ust. 2 pkt 2");
    expect(answerFor("chorobowy", "Mam L4 z kodem B")).toContain("100%");
    expect(answerFor("macierzynski", "Ile wynosi zasiłek 81,5%?")).toContain("21 dni");
    expect(answerFor("dokumenty", "Gdzie złożyć wniosek ZAM?")).toContain("ZAM");
    expect(answerFor("chorobowy", "Dzień dobry")).toContain("e-ZLA");
    expect(answerFor("dokumenty", "xyz")).toContain("odpowiedź symulowana");
  });

  it("answer becomes visible only after the delay; threads are per persona, newest first", () => {
    const t0 = 1_000_000;
    const t = createThread("anna", { category: "chorobowy", question: "Pytanie o L4 w ciąży" }, t0);
    expect(t.status).toBe("oczekuje");
    expect(t.answer).toBeUndefined();
    expect(t.subject).toBe("Zasiłek chorobowy");
    expect(listThreads("anna", t0 + PUE_ANSWER_DELAY_MS - 1)[0].status).toBe("oczekuje");
    const done = listThreads("anna", t0 + PUE_ANSWER_DELAY_MS)[0];
    expect(done.status).toBe("odpowiedziano");
    expect(done.answer).toContain("100%");
    createThread("anna", { category: "dokumenty", subject: "Drugie", question: "Jakie dokumenty?" }, t0 + 10);
    expect(listThreads("anna", t0).map((x) => x.subject)).toEqual(["Drugie", "Zasiłek chorobowy"]);
    expect(listThreads("kasia", t0)).toEqual([]);
  });

  it("route: 401 without session, 400 on invalid input, 201 + list with session", async () => {
    expect((await listRoute(new Request("http://localhost/api"))).status).toBe(401);
    const bad = await postRoute(req("anna", "http://localhost/api", { method: "POST", body: JSON.stringify({ category: "inne", question: "x" }) }));
    expect(bad.status).toBe(400);
    const ok = await postRoute(
      req("anna", "http://localhost/api", { method: "POST", body: JSON.stringify({ category: "macierzynski", question: "Czy tata może przejąć urlop?" }) }),
    );
    expect(ok.status).toBe(201);
    expect((await ok.json()).thread.status).toBe("oczekuje");
    const list = await (await listRoute(req("anna"))).json();
    expect(list.threads).toHaveLength(1);
  });
});

describe("debt certificate mock", () => {
  it("debt depends on the date (kasia paid off an arrear; ola has a current debt with details)", () => {
    const kasia = getPersona("kasia", TODAY)!;
    expect(debtEntryOn(kasia, "2026-08-01").amount).toBe(412.36);
    expect(debtEntryOn(kasia, TODAY).amount).toBe(0);
    const ola = getPersona("ola", TODAY)!;
    const e = debtEntryOn(ola, TODAY);
    expect(e.amount).toBe(1250.4);
    expect(e.details!.reduce((s, d) => s + d.amount, 0)).toBeCloseTo(1250.4, 2);
    expect(ola.parents[0].contributionDebt).toBe(1250.4);
  });

  it("route returns amount, asOf and details", async () => {
    const d = await (await debt(req("anna", "http://localhost/api?date=2026-11-01"))).json();
    expect(d).toMatchObject({ date: "2026-11-01", asOf: "2026-11-01", amount: 0, details: [] });
    const o = await (await debt(req("ola"))).json();
    expect(o.amount).toBe(1250.4);
    expect(o.details).toHaveLength(2);
    expect((await debt(req("ola", "http://localhost/api?date=bad"))).status).toBe(400);
  });

  it("debtWarning: critical with voluntary sickness insurance, warning otherwise", () => {
    expect(debtWarning(100, true).severity).toBe("critical");
    expect(debtWarning(100, false).severity).toBe("warning");
    expect(debtWarning(100, true).source).toContain("art. 14");
  });
});
