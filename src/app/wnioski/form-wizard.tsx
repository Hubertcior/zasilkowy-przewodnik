"use client";

import { ArrowLeft, ArrowRight, Eye, Printer, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { SimulationBadge } from "@/components/simulation-badge";
import { SourceLink } from "@/components/source-link";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WarningCallout } from "@/components/warning-callout";
import type { FormContext, FormDef, FormValues } from "@/forms/types";
import { initialValues, validateForm, visible } from "@/forms/validate";
import type { SubmissionResult } from "@/server/mocks/applications";
import { useApplicationsStore } from "@/store/useApplicationsStore";
import { DocumentPreview } from "./document-preview";
import { FormField } from "./form-field";
import { SubmissionStatus } from "./submission-status";

const RECIPIENT_LABEL = { pracodawca: "Wyślij do pracodawcy", ZUS: "Wyślij do ZUS", USC: "Wyślij do urzędu (gov.pl)", "płatnik zasiłku": "Wyślij do płatnika" } as const;

/** Step-by-step wizard for one form: fields → preview → simulated sending → status. */
export function FormWizard({ def, ctx, role, onClose }: { def: FormDef; ctx: FormContext; role: "matka" | "ojciec"; onClose: () => void }) {
  // Values live only in component state (never persisted) – the bank account number never reaches browser storage.
  const [values, setValues] = useState<FormValues>(() => initialValues(def, def.prefill(ctx, role)));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const addSubmitted = useApplicationsStore((s) => s.add);

  const previewIndex = def.steps.length;
  const stepTitles = [...def.steps.map((s) => s.title), "Podgląd i wysyłka"];
  const recipient = def.recipientFor?.(values) ?? def.recipient;
  const deadline = def.deadline?.(values, ctx);
  const late = deadline && deadline.date < ctx.today;
  const doc = useMemo(() => def.render(values), [def, values]);

  const set = (name: string, v: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  function next() {
    const e = validateForm(def, values, [step]);
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`f-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goTo(i: number) {
    if (i < step) setStep(i);
  }

  async function send() {
    const all = validateForm(def, values);
    if (Object.keys(all).length) {
      setErrors(all);
      const first = def.steps.findIndex((s) => s.fields.some((f) => all[f.name]));
      setStep(Math.max(first, 0));
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/mock/wnioski", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ formId: def.id, values }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.fields ? Object.values(json.fields as Record<string, string>)[0] : (json?.message ?? `Błąd ${res.status}`));
      const r = json as SubmissionResult;
      setResult(r);
      addSubmitted({ caseNumber: r.caseNumber, formId: r.formId, title: r.title, recipient: r.recipient, submittedAt: r.submittedAt, timeline: r.timeline, role });
    } catch (e) {
      setSendError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={onClose} className="-ml-2">
            <ArrowLeft aria-hidden /> Wszystkie wnioski
          </Button>
          <h2 className="text-xl font-semibold tracking-tight">{def.title}</h2>
          <p className="text-muted-foreground text-sm">
            Wypełnia: {role === "matka" ? "mama" : "tata"} · Adresat: {recipient}
          </p>
          <SourceLink source={def.source} />
        </div>
      </div>

      <Stepper steps={stepTitles} current={step} className="print:hidden" />

      {deadline && !result && (
        <WarningCallout
          className="print:hidden"
          warning={
            late
              ? { severity: "warning", title: `Termin minął ${deadline.date}`, text: `${deadline.rule} Wniosek możesz złożyć, ale skutki opóźnienia mogą być niekorzystne – sprawdź je przed wysłaniem.`, source: deadline.source }
              : { severity: "info", title: `Termin złożenia: ${deadline.date}`, text: deadline.rule, source: deadline.source }
          }
        />
      )}

      {step < previewIndex && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base">{def.steps[step].title}</CardTitle>
            <CardDescription>Pola wypełniliśmy danymi z Twojej sprawy i planu z kalkulatora. Sprawdź je i uzupełnij brakujące.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
              className="space-y-5"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {def.steps[step].fields
                  .filter((f) => visible(f, values))
                  .map((f) => (
                    <div key={f.name} className={f.type === "checkbox" || f.type === "textarea" ? "sm:col-span-2" : undefined}>
                      <FormField field={f} value={values[f.name]} error={errors[f.name]} onChange={(v) => set(f.name, v)} />
                    </div>
                  ))}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" onClick={() => (step === 0 ? onClose() : goTo(step - 1))}>
                  <ArrowLeft aria-hidden /> {step === 0 ? "Anuluj" : "Wstecz"}
                </Button>
                <Button type="submit">
                  {step === previewIndex - 1 ? (
                    <>
                      <Eye aria-hidden /> Podgląd wniosku
                    </>
                  ) : (
                    <>
                      Dalej <ArrowRight aria-hidden />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === previewIndex && (
        <div className="space-y-4">
          <DocumentPreview doc={doc} attachments={def.attachments(values)} signature={def.id === "odpis-aktu" ? "(podpis wnioskodawcy)" : "(podpis)"} />
          {!result && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center print:hidden">
              <Button variant="outline" onClick={() => setStep(previewIndex - 1)}>
                <ArrowLeft aria-hidden /> Popraw dane
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer aria-hidden /> Drukuj
              </Button>
              <Button onClick={send} disabled={sending}>
                <Send aria-hidden /> {sending ? "Wysyłam…" : RECIPIENT_LABEL[recipient]} <SimulationBadge className="ml-1" />
              </Button>
            </div>
          )}
          {sendError && <p className="text-destructive text-center text-sm print:hidden">{sendError}</p>}
          {result && <SubmissionStatus result={result} onClose={onClose} />}
        </div>
      )}
    </div>
  );
}
