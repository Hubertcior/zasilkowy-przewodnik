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

  it("PUT rejects everything when ADMIN_PASSWORD is unset", async () => {
    delete process.env.ADMIN_PASSWORD;
    expect((await put(defaultParams(), "")).status).toBe(401);
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
