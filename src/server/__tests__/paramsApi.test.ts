import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getHistory } from "@/app/api/params/history/route";
import { POST as reset } from "@/app/api/params/reset/route";
import { GET, PUT } from "@/app/api/params/route";
import { defaultParams, FileParamsStore, MemoryParamsStore, setParamsStore } from "@/server/paramsStore";

// connection() needs a Next request scope; outside Next it is a no-op for our purposes.
vi.mock("next/server", () => ({ connection: async () => {} }));

const KEY = "test-secret";

function put(body: unknown, key: string | null = KEY) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key !== null) headers["x-admin-key"] = key;
  return PUT(
    new Request("http://localhost/api/params", {
      method: "PUT",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("/api/params", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = KEY;
    setParamsStore(new MemoryParamsStore());
  });
  afterEach(() => {
    setParamsStore(undefined);
    delete process.env.ADMIN_PASSWORD;
  });

  it("GET returns defaults", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(defaultParams());
  });

  it("PUT without/with wrong key → 401", async () => {
    expect((await put(defaultParams(), null)).status).toBe(401);
    expect((await put(defaultParams(), "nope")).status).toBe(401);
  });

  it("without ADMIN_PASSWORD the demo default password is used", async () => {
    delete process.env.ADMIN_PASSWORD;
    expect((await put(defaultParams(), "")).status).toBe(401);
    expect((await put(defaultParams(), KEY)).status).toBe(401);
    expect((await put(defaultParams(), "demo-zus")).status).toBe(200);
  });

  it("PUT with invalid data → 400", async () => {
    const bad = { ...defaultParams(), minWage: -1 };
    const res = await put(bad);
    expect(res.status).toBe(400);
    expect((await res.json()).issues.length).toBeGreaterThan(0);
    expect((await put("{not json")).status).toBe(400);
  });

  it("PUT valid → persisted, history, reset", async () => {
    const changed = { ...defaultParams(), minWage: 5000, version: "2027.1" };
    expect((await put(changed)).status).toBe(200);
    expect((await (await GET()).json()).minWage).toBe(5000);

    const r = await reset(new Request("http://localhost/api/params/reset", { method: "POST", headers: { "x-admin-key": KEY } }));
    expect(r.status).toBe(200);
    expect((await (await GET()).json()).minWage).toBe(defaultParams().minWage);

    const history = await (await getHistory()).json();
    expect(history.map((h: { action: string }) => h.action)).toEqual(["reset", "put"]);
  });

  it("reset requires admin", async () => {
    const r = await reset(new Request("http://localhost/api/params/reset", { method: "POST" }));
    expect(r.status).toBe(401);
  });
});

describe("FileParamsStore", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "params-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips put/get/reset/history", async () => {
    const store = new FileParamsStore(dir);
    expect(await store.get()).toEqual(defaultParams());
    await store.put({ ...defaultParams(), minWage: 5100 }, "tester");
    expect((await new FileParamsStore(dir).get()).minWage).toBe(5100);
    await store.reset("tester");
    expect((await store.get()).minWage).toBe(defaultParams().minWage);
    const h = await store.history();
    expect(h).toHaveLength(2);
    expect(h[1].author).toBe("tester");
  });
});

describe("admin session + params affect calculation", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "s3cret";
    setParamsStore(new MemoryParamsStore());
  });
  afterEach(() => {
    setParamsStore(undefined);
    delete process.env.ADMIN_PASSWORD;
  });

  it("login sets a session cookie accepted by PUT; wrong password → 401", async () => {
    const { POST: login } = await import("@/app/api/admin/login/route");
    expect((await login(new Request("http://x", { method: "POST", body: JSON.stringify({ password: "nope" }) }))).status).toBe(401);
    const ok = await login(new Request("http://x", { method: "POST", body: JSON.stringify({ password: "s3cret" }) }));
    expect(ok.status).toBe(200);
    const cookie = ok.headers.get("set-cookie")!.split(";")[0];
    const res = await PUT(
      new Request("http://x", { method: "PUT", headers: { cookie, "x-change-note": encodeURIComponent("test zmiany") }, body: JSON.stringify(defaultParams()) }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).version).toBe("2026.2"); // unchanged version is bumped
    const history = await (await getHistory()).json();
    expect(history[0].note).toBe("test zmiany");
  });

  it("forged / expired session cookie is rejected", async () => {
    const { createSessionToken } = await import("@/server/adminAuth");
    const expired = createSessionToken(Date.now() - 9 * 3600_000);
    for (const token of ["123.abc", expired]) {
      const res = await PUT(new Request("http://x", { method: "PUT", headers: { cookie: `zp_admin=${token}` }, body: JSON.stringify(defaultParams()) }));
      expect(res.status).toBe(401);
    }
  });

  it("changing rates.parental to 0.75 changes /api/calculate", async () => {
    const { POST: calculate } = await import("@/app/api/calculate/route");
    const body = JSON.stringify({
      parents: [{ role: "matka", periods: [{ title: "umowa_o_prace", sickness: "obowiazkowe", from: "2020-01-01" }], incomes: [] }],
      scenario: { kind: "urodzenie", birthDate: "2026-06-10", children: 1, zaZyciem: false },
      baseOverride: { matka: 6040.3 },
      plan: { longApplication: false, parental: [{ parent: "matka", weeks: 32 }] },
    });
    const run = async () => (await (await calculate(new Request("http://x", { method: "POST", body }))).json()).schedule.periods[1].monthlyAmount;
    expect(await run()).toBe(4228.21);
    const p = defaultParams();
    p.rates.parental = 0.75;
    expect((await PUT(new Request("http://x", { method: "PUT", headers: { "x-admin-key": "s3cret" }, body: JSON.stringify(p) }))).status).toBe(200);
    expect(await run()).toBe(4530.23);
  });
});
