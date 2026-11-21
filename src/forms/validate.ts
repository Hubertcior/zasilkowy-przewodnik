import { z } from "zod";
import type { FieldDef, FormDef, FormValues } from "./types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** zod schema for one field (required-ness handled here, visibility by the caller). */
export function fieldSchema(f: FieldDef): z.ZodType {
  switch (f.type) {
    case "checkbox":
      return f.required ? z.literal(true, { error: "Zaznacz to pole" }) : z.boolean();
    case "date":
      return f.required ? z.string().regex(ISO, "Podaj datę") : z.union([z.literal(""), z.string().regex(ISO, "Nieprawidłowa data")]);
    case "pesel":
      return f.required
        ? z.string().regex(/^\d{11}$/, "PESEL ma 11 cyfr")
        : z.union([z.literal(""), z.string().regex(/^\d{11}$/, "PESEL ma 11 cyfr")]);
    case "iban":
      // Polish account number: 26 digits, optional PL prefix and spaces.
      return z
        .string()
        .transform((s) => s.replace(/\s/g, "").toUpperCase())
        .pipe(z.union([z.literal(""), z.string().regex(/^(PL)?\d{26}$/, "Numer rachunku ma 26 cyfr")]));
    case "select":
      return f.required
        ? z.enum((f.options ?? []).map((o) => o.value) as [string, ...string[]], { error: "Wybierz jedną z opcji" })
        : z.union([z.literal(""), z.enum((f.options ?? []).map((o) => o.value) as [string, ...string[]])]);
    default: {
      const s = z.string().trim().max(f.type === "textarea" ? 2000 : 200, "Za długi tekst");
      return f.required ? s.min(1, "Uzupełnij to pole") : s;
    }
  }
}

export function visible(f: FieldDef, v: FormValues): boolean {
  return f.showIf ? f.showIf(v) : true;
}

function defaultFor(f: FieldDef): string | boolean {
  return f.type === "checkbox" ? false : "";
}

/** Validates visible fields of the given steps (all steps if omitted) + the form's cross-field check. */
export function validateForm(def: FormDef, values: FormValues, stepIndexes?: number[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const steps = stepIndexes ? stepIndexes.map((i) => def.steps[i]).filter(Boolean) : def.steps;
  const names = new Set<string>();
  for (const step of steps) {
    for (const f of step.fields) {
      if (!visible(f, values)) continue;
      names.add(f.name);
      const r = fieldSchema(f).safeParse(values[f.name] ?? defaultFor(f));
      if (!r.success) errors[f.name] = r.error.issues[0]?.message ?? "Nieprawidłowa wartość";
    }
  }
  for (const [k, msg] of Object.entries(def.check?.(values) ?? {})) {
    if (names.has(k) && !errors[k]) errors[k] = msg;
  }
  return errors;
}

/** Initial values: defaults for every field, overridden by prefill. */
export function initialValues(def: FormDef, prefill: FormValues): FormValues {
  const out: FormValues = {};
  for (const s of def.steps) for (const f of s.fields) out[f.name] = defaultFor(f);
  return { ...out, ...prefill };
}

/** Values safe to keep in browser storage (sensitive fields removed). */
export function withoutSensitive(def: FormDef, values: FormValues): FormValues {
  const sensitive = new Set(def.steps.flatMap((s) => s.fields.filter((f) => f.sensitive).map((f) => f.name)));
  return Object.fromEntries(Object.entries(values).filter(([k]) => !sensitive.has(k)));
}

/** Values limited to known fields of the form (server-side sanitising). */
export const FormValuesSchema = z.record(z.string().max(60), z.union([z.string().max(2000), z.boolean()]));
