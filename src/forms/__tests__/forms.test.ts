import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { calculateAll } from "@/engine/calculate";
import { ParamsSchema } from "@/engine/params";
import { FORMS, getForm, recommendForms } from "@/forms";
import type { FormContext, FormValues } from "@/forms/types";
import { initialValues, validateForm, withoutSensitive } from "@/forms/validate";
import { currentStatus, submitApplication } from "@/server/mocks/applications";
import { getPersona } from "@/server/mocks/personas";

const params = ParamsSchema.parse(defaults);
const TODAY = "2026-11-21";

function ctxFor(id: string, plan?: FormContext["plan"]): { ctx: FormContext; calc: ReturnType<typeof calculateAll> } {
  const p = getPersona(id, TODAY)!;
  const calc = calculateAll({ parents: p.parents, scenario: p.scenario, plan, today: TODAY }, params);
  return {
    calc,
    ctx: {
      today: TODAY,
      parents: p.parents,
      scenario: p.scenario,
      plan: calc.plan,
      periods: calc.schedule.periods,
      person: { name: p.name, pesel: p.pesel },
      deadlines: params.deadlines,
    },
  };
}

const fill = (formId: string, ctx: FormContext, role: "matka" | "ojciec", extra: FormValues = {}) => {
  const def = getForm(formId)!;
  return { def, values: { ...initialValues(def, def.prefill(ctx, role)), ...extra } };
};

describe("form definitions", () => {
  it("unique ids; every form has steps, source and renders without values", () => {
    expect(new Set(FORMS.map((f) => f.id)).size).toBe(FORMS.length);
    const { ctx } = ctxFor("anna");
    for (const f of FORMS) {
      expect(f.steps.length).toBeGreaterThan(0);
      expect(f.source.length).toBeGreaterThan(10);
      const r = f.render(initialValues(f, f.prefill(ctx, "matka")));
      expect(r.title.length).toBeGreaterThan(5);
    }
  });

  it("maternity before birth (anna, pregnancy): prefill 6 weeks before due date, max 6 weeks rule", () => {
    const { ctx } = ctxFor("anna");
    const { def, values } = fill("macierzynski-przed-porodem", ctx, "matka", { place: "Warszawa" });
    expect(values.name).toBe("Anna Kowalczyk");
    expect(values.employer).toBe("Nordlog Sp. z o.o.");
    expect(values.dueDate).toBe("2027-02-21");
    expect(values.leaveFrom).toBe("2027-01-10");
    expect(validateForm(def, values)).toEqual({});
    expect(validateForm(def, { ...values, leaveFrom: "2026-12-01" }).leaveFrom).toContain("6 tygodni");
    expect(def.render(values).paragraphs[0]).toContain("10.01.2027");
    expect(def.attachments(values)[0]).toContain("zaświadczenia lekarskiego");
  });

  it("parental leave (kasia, born 10 days ago, 81.5% plan): full-leave mode and 21-day deadline", () => {
    const { ctx } = ctxFor("kasia");
    const { def, values } = fill("rodzicielski", ctx, "matka", { name: "Katarzyna Wiśniewska", employer: "X", place: "Kraków" });
    expect(values.mode).toBe("pelny");
    expect(values.parentalFrom).toBeTruthy();
    expect(validateForm(def, values)).toEqual({});
    const d = def.deadline!(values, ctx)!;
    expect(d.date).toBe("2026-12-02"); // birth 2026-11-11 + 21 days
    expect(def.render(values).paragraphs[0]).toContain("w pełnym wymiarze");
  });

  it("parental leave: part mode requires part number, combined work requires fraction; period check", () => {
    const { ctx } = ctxFor("anna");
    const { def, values } = fill("rodzicielski", ctx, "matka", {
      place: "W",
      mode: "czesc",
      parentalFrom: "2027-08-01",
      parentalTo: "2027-07-01",
      partNumber: "",
      combineWork: true,
      workFraction: "",
    });
    const e = validateForm(def, values);
    expect(e.parentalTo).toBeDefined();
    expect(e.partNumber).toBeDefined();
    expect(e.workFraction).toBeDefined();
    const ok = { ...values, parentalTo: "2027-09-30", partNumber: "2", workFraction: "1/2", combineFrom: "2027-08-01", combineTo: "2027-09-30", extendedPart: "nie" };
    expect(validateForm(def, ok)).toEqual({});
    expect(def.render(ok).paragraphs.join(" ")).toContain("1/2 etatu");
    expect(def.deadline!(ok, ctx)!.date).toBe("2027-07-11");
  });

  it("paternity: max 14 days, until child is 12 months, 7-day deadline", () => {
    const { ctx } = ctxFor("kasia", { longApplication: false, parental: [], paternityWeeks: 2 });
    const { def, values } = fill("ojcowski", ctx, "ojciec", { name: "Jan Wiśniewski", place: "Kraków" });
    expect(values.paternityFrom).toBeTruthy();
    expect(validateForm(def, values)).toEqual({});
    expect(validateForm(def, { ...values, paternityFrom: "2027-01-01", paternityTo: "2027-01-20" }).paternityTo).toContain("2 tygodnie");
    expect(validateForm(def, { ...values, paternityFrom: "2027-11-05", paternityTo: "2027-11-11" }).paternityTo).toContain("12 miesięcy");
    expect(def.deadline!({ ...values, paternityFrom: "2027-01-08" }, ctx)!.date).toBe("2027-01-01");
  });

  it("supplementary leave (marta, premature): must start the day after maternity ends", () => {
    const { ctx } = ctxFor("marta");
    const { def, values } = fill("uzupelniajacy", ctx, "matka", { name: "Marta", employer: "Y", place: "Z", otherParentDecl: true });
    expect(values.maternityEnd).toBeTruthy();
    expect(validateForm(def, values)).toEqual({});
    expect(validateForm(def, { ...values, supplementaryFrom: "2030-01-01" }).supplementaryFrom).toBeDefined();
    expect(validateForm(def, { ...values, otherParentDecl: false }).otherParentDecl).toBeDefined();
  });

  it("resignation needs at least 14 weeks after birth", () => {
    const { ctx } = ctxFor("kasia");
    const { def, values } = fill("rezygnacja-macierzynskiego", ctx, "matka", { name: "K", employer: "E", place: "P", returnDate: "2026-12-01" });
    expect(validateForm(def, values).returnDate).toContain("14 tygodni");
    expect(validateForm(def, { ...values, returnDate: "2027-03-01" })).toEqual({});
  });

  it("ZAM: prefill for an employee (anna) and self-employed (kasia); bank account is sensitive and validated", () => {
    const anna = fill("zam", ctxFor("anna").ctx, "matka");
    expect(anna.values).toMatchObject({ firstName: "Anna", lastName: "Kowalczyk", pesel: "92030512348", sendTo: "pracodawca", reason: "przed_porodem", voluntary: "nie_dotyczy" });
    const kasia = fill("zam", ctxFor("kasia").ctx, "matka");
    expect(kasia.values).toMatchObject({ sendTo: "ZUS", voluntary: "tak", reason: "urodzenie", payerId: "90111023456", scopeMaternity: true });
    const v = { ...kasia.values, houseNo: "1", postCode: "30-001", city: "Kraków", childData: "Jan Wiśniewski, ur. 11.11.2026, Kraków", truth: true, account: "12 3456 7890 1234 5678 9012 3456" };
    expect(validateForm(kasia.def, v)).toEqual({});
    expect(validateForm(kasia.def, { ...v, account: "123" }).account).toContain("26 cyfr");
    expect(validateForm(kasia.def, { ...v, postCode: "30001" }).postCode).toBeDefined();
    expect(withoutSensitive(kasia.def, v).account).toBeUndefined();
    const r = kasia.def.render(v);
    expect(r.rows!.find((x) => x.label === "Rachunek bankowy")!.value).toBe("•••• 3456");
    expect(kasia.def.recipientFor!(v)).toBe("ZUS");
    // self-employed sending to ZUS: no Z-3 needed
    expect(kasia.def.attachments(v).some((a) => a.includes("Z-3"))).toBe(false);
  });

  it("ZAM requires at least one scope", () => {
    const { def, values } = fill("zam", ctxFor("kasia").ctx, "matka");
    const e = validateForm(def, { ...values, scopeMaternity: false, scopeParental: false, scopePaternity: false, scopeSupplementary: false, scopeAdoption: false });
    expect(e.scopeMaternity).toContain("Zaznacz");
  });

  it("birth certificate request validates and renders", () => {
    const { def, values } = fill("odpis-aktu", ctxFor("kasia").ctx, "matka", { childName: "Jan W.", birthPlace: "Kraków" });
    expect(validateForm(def, values)).toEqual({});
    expect(def.render(values).paragraphs[0]).toContain("odpisu skróconego");
  });
});

describe("recommendForms", () => {
  it("employee in pregnancy (anna): maternity-before-birth, ZAM, odpis", () => {
    const { calc } = ctxFor("anna");
    const ids = recommendForms(calc.filing, calc.plan).map((r) => `${r.formId}:${r.role}`);
    expect(ids).toContain("macierzynski-przed-porodem:matka");
    expect(ids).toContain("zam:matka");
    expect(ids).toContain("odpis-aktu:matka");
  });

  it("self-employed (kasia): ZAM to ZUS, no leave applications to an employer for the mother", () => {
    const { calc } = ctxFor("kasia");
    const recs = recommendForms(calc.filing, calc.plan);
    expect(recs.some((r) => r.formId === "zam" && r.role === "matka")).toBe(true);
    expect(recs.some((r) => r.formId === "macierzynski-przed-porodem")).toBe(false);
  });

  it("adoption (ewa-piotr): leave on maternity terms", () => {
    const { calc } = ctxFor("ewa-piotr");
    expect(recommendForms(calc.filing, calc.plan).some((r) => r.formId === "na-warunkach-macierzynskiego")).toBe(true);
  });
});

describe("submission mock", () => {
  it("validates, returns case number and a status timeline without the account number", () => {
    const { ctx } = ctxFor("anna");
    const { values } = fill("macierzynski-przed-porodem", ctx, "matka", { place: "Warszawa" });
    const t0 = Date.parse("2026-11-21T10:00:00Z");
    const out = submitApplication({ formId: "macierzynski-przed-porodem", values }, t0, () => 0.123456);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.caseNumber).toBe("SYM-MAC/2026/123456");
    expect(out.result.recipient).toBe("pracodawca");
    expect(out.result.timeline.map((t) => t.status)).toEqual(["złożony", "przyjęty", "w trakcie rozpatrywania"]);
    expect(currentStatus(out.result.timeline, t0 + 1000).status).toBe("złożony");
    expect(currentStatus(out.result.timeline, t0 + 5000).status).toBe("przyjęty");
    expect(currentStatus(out.result.timeline, t0 + 60_000).status).toBe("w trakcie rozpatrywania");
    expect(submitApplication({ formId: "nope", values: {} }).ok).toBe(false);
    const bad = submitApplication({ formId: "macierzynski-przed-porodem", values: { ...values, name: "" } });
    expect(bad.ok === false && bad.status).toBe(400);
  });
});
