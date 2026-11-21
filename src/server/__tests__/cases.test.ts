import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import defaults from "@/config/params.default.json";
import { GET as getCase } from "@/app/api/cases/[id]/route";
import { GET as listCases } from "@/app/api/cases/route";
import { POST as upload } from "@/app/api/cases/upload/route";
import { compareCase } from "@/engine/cases";
import { ParamsSchema } from "@/engine/params";
import { loadAllCases } from "@/server/cases";

vi.mock("next/server", () => ({ connection: async () => {} }));
const params = ParamsSchema.parse(defaults);

describe("example cases", () => {
  beforeEach(() => {
    process.env.CASES_DIR = "/nonexistent-dir-for-tests";
  });
  afterEach(() => {
    delete process.env.CASES_DIR;
  });

  it("at least 8 synthetic fixtures, all valid and synthetic", async () => {
    const { cases, errors } = await loadAllCases();
    expect(errors).toEqual([]);
    expect(cases.length).toBeGreaterThanOrEqual(8);
    expect(cases.every((c) => c.data.synthetic && c.origin === "synthetic")).toBe(true);
    expect(new Set(cases.map((c) => c.data.id)).size).toBe(cases.length);
  });

  it("every fixture matches its expected result", async () => {
    const { cases } = await loadAllCases();
    for (const c of cases) {
      const cmp = compareCase(c.data, params);
      expect(cmp.diffs, c.data.id).toEqual([]);
    }
  });

  it("GET /api/cases and /api/cases/:id", async () => {
    const list = await (await listCases()).json();
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list[0]).toHaveProperty("hasExpected");
    const one = await getCase(new Request("http://x"), { params: Promise.resolve({ id: list[0].id }) });
    expect(one.status).toBe(200);
    expect((await one.json()).parents.length).toBeGreaterThan(0);
  });

  it("POST /api/cases/upload validates JSON (raw and multipart)", async () => {
    const { cases } = await loadAllCases();
    const good = JSON.stringify(cases[0].data);
    const raw = await upload(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: good }));
    expect(raw.status).toBe(200);
    expect((await raw.json()).origin).toBe("upload");

    const form = new FormData();
    form.append("file", new File([good], "sprawa.json", { type: "application/json" }));
    expect((await upload(new Request("http://x", { method: "POST", body: form }))).status).toBe(200);

    const badForm = new FormData();
    badForm.append("file", new File(["x"], "sprawa.pdf"));
    expect((await upload(new Request("http://x", { method: "POST", body: badForm }))).status).toBe(400);

    expect((await upload(new Request("http://x", { method: "POST", body: "{nope" }))).status).toBe(400);
    expect((await upload(new Request("http://x", { method: "POST", body: JSON.stringify({ id: "x" }) }))).status).toBe(400);
  });
});
