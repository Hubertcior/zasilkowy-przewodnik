import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import defaults from "@/config/params.default.json";
import { calculateAll } from "@/engine/calculate";
import { ParamsSchema } from "@/engine/params";
import { CaseFileSchema } from "@/engine/schemas";
import { extractionToForm, formToCase, parseExtraction, uncertainFields, validateExtractionForm, type Extraction } from "@/lib/extraction";
import { extractFromPdfs } from "@/server/extract";

vi.mock("next/server", () => ({ connection: async () => {} }));

const params = ParamsSchema.parse(defaults);
const f = <T>(value: T | null, confidence: "wysoka" | "srednia" | "niska" = "wysoka", sourceQuote: string | null = "cytat") => ({ value, confidence, sourceQuote });

/** A plausible model response for an employee with Z-3 and ZAM (synthetic data). */
function sample(): Extraction {
  return {
    documents: [
      { kind: "Z-3", description: "Zaświadczenie płatnika składek" },
      { kind: "ZAM", description: "Wniosek o zasiłek macierzyński" },
    ],
    applicantRole: f("matka"),
    applicantName: f("Jan(ina) Testowa"),
    insuranceTitle: f("umowa_o_prace"),
    sickness: f("obowiazkowe"),
    insuredFrom: f("2019-03-01"),
    payerName: f("Firma Testowa Sp. z o.o."),
    payerInsuredCount: f(120, "srednia"),
    incomes: Array.from({ length: 12 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, "0")}`, gross: 7000, confidence: "wysoka" as const, sourceQuote: "7000,00" })),
    declaredBase: f(null, "niska", null),
    scenario: f("urodzenie"),
    eventDate: f("2026-11-10"),
    children: f(1),
    zaZyciem: f(false),
    longApplication: f(true),
    gestationWeek: f(null, "niska", null),
    birthWeightG: f(null, "niska", null),
    hospitalWeeks: f(null, "niska", null),
    notes: [],
  };
}

function fakeClient(responses: { stop_reason: string; model: string; parsed_output: unknown }[]) {
  const parse = vi.fn(async () => responses.shift());
  return { client: { beta: { messages: { parse } } } as unknown as Anthropic, parse };
}

const pdf = [{ name: "z3.pdf", data: Buffer.from("%PDF-1.7 test") }];

describe("parseExtraction", () => {
  it("accepts a valid response and normalises malformed values", () => {
    const raw = sample();
    raw.insuredFrom = f("01.03.2019");
    raw.children = f(0);
    raw.incomes.push({ month: "2026-1", gross: 1, confidence: "niska", sourceQuote: null });
    const r = parseExtraction(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.insuredFrom).toMatchObject({ value: null, confidence: "niska" });
    expect(r.data.children.value).toBeNull();
    expect(r.data.incomes).toHaveLength(12);
    expect(uncertainFields(r.data)).toContain("insuredFrom");
  });

  it("rejects a response with the wrong shape", () => {
    const r = parseExtraction({ applicantRole: "matka" });
    expect(r.ok).toBe(false);
  });
});

describe("extractFromPdfs (mocked model)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends PDFs as base64 documents with a schema and fallbacks, returns the extraction", async () => {
    const { client, parse } = fakeClient([{ stop_reason: "end_turn", model: "claude-opus-5-5", parsed_output: sample() }]);
    const out = await extractFromPdfs(pdf, { client });
    expect(out.ok).toBe(true);
    const req = (parse.mock.calls[0] as unknown[])[0] as Record<string, unknown> & { messages: { content: { type: string; source?: { data: string } }[] }[] };
    expect(req.fallbacks).toBe("default");
    expect(req.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(req.messages[0].content[0].type).toBe("document");
    expect(req.messages[0].content[0].source?.data).toBe(Buffer.from("%PDF-1.7 test").toString("base64"));
  });

  it("retries once with the validation error, then succeeds", async () => {
    const { client, parse } = fakeClient([
      { stop_reason: "end_turn", model: "m", parsed_output: { bad: true } },
      { stop_reason: "end_turn", model: "m", parsed_output: sample() },
    ]);
    const out = await extractFromPdfs(pdf, { client });
    expect(out.ok).toBe(true);
    expect(parse).toHaveBeenCalledTimes(2);
    const second = (parse.mock.calls[1] as unknown[])[0] as { messages: { content: { type: string; text?: string }[] }[] };
    expect(second.messages[0].content.at(-1)?.text).toContain("nie przeszła walidacji");
  });

  it("gives up after two invalid answers and reports a refusal clearly", async () => {
    const bad = fakeClient([
      { stop_reason: "end_turn", model: "m", parsed_output: null },
      { stop_reason: "end_turn", model: "m", parsed_output: null },
    ]);
    expect(await extractFromPdfs(pdf, { client: bad.client })).toMatchObject({ ok: false, status: 502 });
    const refused = fakeClient([{ stop_reason: "refusal", model: "m", parsed_output: null }]);
    expect(await extractFromPdfs(pdf, { client: refused.client })).toMatchObject({ ok: false, status: 422 });
  });
});

describe("verification form → CaseFile → engine", () => {
  it("builds a valid case that the engine calculates (employee, 12 × 7000 zł)", () => {
    const form = extractionToForm(sample());
    expect(validateExtractionForm(form)).toEqual({});
    const c = formToCase(form);
    expect(CaseFileSchema.safeParse(c).success).toBe(true);
    const r = calculateAll({ parents: c.parents, scenario: c.scenario, today: "2026-11-21" }, params);
    expect(r.eligibility.matka?.maternityEligible).toBe(true);
    expect(r.bases.matka?.base).toBe(6040.3);
  });

  it("requires a declared base for a sole trader with sickness insurance and builds 12 months of it", () => {
    const e = sample();
    e.insuranceTitle = f("dzialalnosc");
    e.sickness = f("dobrowolne");
    e.incomes = [];
    const form = extractionToForm(e);
    expect(validateExtractionForm(form).declaredBase).toBeDefined();
    const c = formToCase({ ...form, declaredBase: "5000" });
    expect(c.parents[0].declaredBase).toHaveLength(12);
    expect(c.parents[0].declaredBase?.[11].month).toBe("2026-10");
  });

  it("missing dates are reported, not guessed", () => {
    const e = sample();
    e.eventDate = f(null, "niska", null);
    expect(validateExtractionForm(extractionToForm(e)).eventDate).toBeDefined();
  });
});

describe("/api/cases/extract without ANTHROPIC_API_KEY", () => {
  it("GET reports disabled, POST returns 503 (UI falls back to manual entry)", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const { GET, POST } = await import("@/app/api/cases/extract/route");
    expect(await (await GET()).json()).toMatchObject({ enabled: false });
    expect((await POST(new Request("http://localhost/api", { method: "POST", body: new FormData() }))).status).toBe(503);
    if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
  });
});
