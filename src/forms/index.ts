import type { FilingStep } from "@/engine/filing";
import type { LeavePlan } from "@/engine/types";
import { birthCertificate } from "./birth-certificate";
import { LEAVE_FORMS } from "./leave";
import type { FormDef } from "./types";
import { zam } from "./zam";

export type { FieldDef, FormContext, FormDef, FormValues, RenderedForm } from "./types";

export const FORMS: FormDef[] = [...LEAVE_FORMS, zam, birthCertificate];

export function getForm(id: string): FormDef | undefined {
  return FORMS.find((f) => f.id === id);
}

export type Role = "matka" | "ojciec";

export interface Recommendation {
  formId: string;
  role: Role;
  /** Filing step (KAN-27) that this form implements. */
  stepId: string;
  why: string;
  deadline?: string;
}

/**
 * Forms recommended for the case, derived from the filing guide (buildFilingGuide, KAN-27).
 * Leave applications are addressed to the employer, so they are recommended only where the step goes to "pracodawca".
 */
export function recommendForms(filing: FilingStep[], plan?: LeavePlan): Recommendation[] {
  const out: Recommendation[] = [];
  const add = (formId: string, role: Role, step: FilingStep) => {
    if (!out.some((r) => r.formId === formId && r.role === role)) out.push({ formId, role, stepId: step.id, why: step.title, deadline: step.deadline });
  };
  for (const step of filing) {
    const employer = step.where === "pracodawca";
    const roleFromId = step.id.endsWith("-ojciec") ? "ojciec" : "matka";
    switch (true) {
      case step.id === "macierzynski-przed-porodem":
        if (employer) add("macierzynski-przed-porodem", "matka", step);
        break;
      case step.id.startsWith("wniosek-macierzynski-"):
        if (employer && roleFromId === "matka" && plan?.longApplication) add("rodzicielski", "matka", step);
        add("zam", roleFromId, step);
        break;
      case step.id === "uzupelniajacy":
        if (employer) add("uzupelniajacy", "matka", step);
        break;
      case step.id.startsWith("rodzicielski-"):
        if (employer) add("rodzicielski", roleFromId, step);
        else add("zam", roleFromId, step);
        break;
      case step.id === "przejecie-macierzynskiego":
        add("rezygnacja-macierzynskiego", "matka", step);
        if (employer) add("przejecie-macierzynskiego", "ojciec", step);
        add("zam", "ojciec", step);
        break;
      case step.id === "ojcowski":
        if (employer) add("ojcowski", "ojciec", step);
        add("zam", "ojciec", step);
        break;
      case step.id === "dokumenty-adopcja":
        if (employer) add("na-warunkach-macierzynskiego", "matka", step);
        add("zam", "matka", step);
        break;
      case step.id === "odpis-aktu-urodzenia":
        add("odpis-aktu", "matka", step);
        break;
    }
  }
  return out;
}
