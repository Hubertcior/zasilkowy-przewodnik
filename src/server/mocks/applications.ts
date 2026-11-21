import { getForm } from "@/forms";
import type { FormValues } from "@/forms/types";
import { validateForm } from "@/forms/validate";

// SYMULACJA wysyłki wniosków (KAN-30). Stateless: the response carries the whole status timeline, so it also works
// on serverless hosting. Values are validated but never stored (the bank account number is not even echoed).

export type ApplicationStatus = "złożony" | "przyjęty" | "w trakcie rozpatrywania";

export interface SubmissionResult {
  simulation: true;
  caseNumber: string;
  formId: string;
  title: string;
  recipient: string;
  submittedAt: string;
  timeline: { status: ApplicationStatus; at: string; note: string }[];
}

/** Simulated delays between statuses (ms). */
export const STATUS_DELAYS_MS = { accepted: 4000, inProgress: 12000 } as const;

export type SubmitOutcome = { ok: true; result: SubmissionResult } | { ok: false; status: 400 | 404; errors: Record<string, string> | string };

export function submitApplication(
  input: { formId: string; values: FormValues },
  nowMs: number = Date.now(),
  random: () => number = Math.random,
): SubmitOutcome {
  const def = getForm(input.formId);
  if (!def) return { ok: false, status: 404, errors: "Nieznany formularz" };
  const errors = validateForm(def, input.values);
  if (Object.keys(errors).length) return { ok: false, status: 400, errors };
  const recipient = def.recipientFor?.(input.values) ?? def.recipient;
  const year = new Date(nowMs).getUTCFullYear();
  const caseNumber = `SYM-${def.id.slice(0, 3).toUpperCase()}/${year}/${String(Math.floor(random() * 1_000_000)).padStart(6, "0")}`;
  const at = (ms: number) => new Date(nowMs + ms).toISOString();
  const who = recipient === "ZUS" ? "ZUS" : recipient === "USC" ? "urząd stanu cywilnego" : "pracodawca";
  return {
    ok: true,
    result: {
      simulation: true,
      caseNumber,
      formId: def.id,
      title: def.title,
      recipient,
      submittedAt: at(0),
      timeline: [
        { status: "złożony", at: at(0), note: `Wniosek wysłany do: ${who} (symulacja).` },
        { status: "przyjęty", at: at(STATUS_DELAYS_MS.accepted), note: `Potwierdzenie odbioru – ${who} nadał numer sprawy ${caseNumber}.` },
        {
          status: "w trakcie rozpatrywania",
          at: at(STATUS_DELAYS_MS.inProgress),
          note: recipient === "USC" ? "Urząd przygotowuje odpis." : "Wniosek jest rozpatrywany. W razie braków płatnik poprosi o uzupełnienie.",
        },
      ],
    },
  };
}

/** Current status for a timeline at a given moment. */
export function currentStatus(timeline: SubmissionResult["timeline"], nowMs: number = Date.now()) {
  return [...timeline].reverse().find((t) => Date.parse(t.at) <= nowMs) ?? timeline[0];
}
