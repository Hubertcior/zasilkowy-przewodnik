import type { Params } from "@/engine/params";
import type { BenefitPeriod, LeavePlan, ParentData, Scenario } from "@/engine/types";

// Application forms (KAN-30): our own leave application templates (content required by the regulation
// Dz.U. 2025 poz. 322), the ZUS ZAM form fields and a simulated birth certificate copy request.

export type FieldType = "text" | "textarea" | "date" | "select" | "checkbox" | "pesel" | "iban";
export type FormValues = Record<string, string | boolean>;

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  /** Sensitive fields (bank account) are never persisted in browser storage. */
  sensitive?: boolean;
  /** Field shown (and validated) only when this returns true. */
  showIf?: (v: FormValues) => boolean;
}

export interface FormStep {
  title: string;
  fields: FieldDef[];
}

export type FormRecipient = "pracodawca" | "ZUS" | "płatnik zasiłku" | "USC";

/** Data available for prefill (from the store and the engine's schedule). */
export interface FormContext {
  today: string;
  parents: ParentData[];
  scenario: Scenario;
  plan?: LeavePlan;
  periods: BenefitPeriod[];
  /** The logged-in (simulated) person, normally the mother. */
  person?: { name?: string; pesel?: string };
  deadlines: Params["deadlines"];
}

export interface FormDeadline {
  date: string;
  rule: string;
  source: string;
}

export interface RenderedForm {
  title: string;
  addressee: string;
  /** Letter header: "place, date" and the applicant's name (leave applications). */
  intro?: string;
  paragraphs: string[];
  /** Label/value rows (used by ZAM, which is a form rather than a letter). */
  rows?: { label: string; value: string }[];
}

export interface FormDef {
  id: string;
  title: string;
  short: string;
  description: string;
  applicant: "matka" | "ojciec" | "rodzic";
  recipient: FormRecipient;
  /** Legal basis / origin of the template. */
  source: string;
  steps: FormStep[];
  /** `role` = who fills in the form (relevant when applicant is "rodzic"). */
  prefill: (ctx: FormContext, role: "matka" | "ojciec") => FormValues;
  /** Recipient depending on values (e.g. ZAM goes to the employer or to ZUS). */
  recipientFor?: (v: FormValues) => FormRecipient;
  /** Cross-field validation, returns field → message. */
  check?: (v: FormValues) => Record<string, string>;
  attachments: (v: FormValues) => string[];
  render: (v: FormValues) => RenderedForm;
  deadline?: (v: FormValues, ctx: FormContext) => FormDeadline | undefined;
}
