"use client";

import { useEffect, useState } from "react";
import type { CalculateResult, PregnancyCalcResult } from "@/engine/calculate";
import type { EligibilityResult } from "@/engine/eligibility";
import { useCaseStore } from "@/store/useCaseStore";

export interface CalculationState {
  loading: boolean;
  error?: string;
  calc?: CalculateResult;
  /** Hypothetical pregnancy sick leave (code B) from today until the day before the due date. */
  pregnancy?: PregnancyCalcResult;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.issues?.[0]?.message ?? json?.error ?? `Błąd ${res.status}`);
  return json as T;
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Runs the server-side engine for the case in the store (POST /api/calculate, /api/pregnancy). */
export function useCalculation(): CalculationState & { hasData: boolean } {
  const { parents, scenario, plan } = useCaseStore();
  const [state, setState] = useState<CalculationState>({ loading: true });
  const hasData = !!scenario && parents.length > 0;

  useEffect(() => {
    if (!scenario || parents.length === 0) return;
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    const mother = parents.find((p) => p.role === "matka") ?? parents[0];

    const calcP = post<CalculateResult>("/api/calculate", { parents, scenario, plan, today });
    const pregP =
      scenario.kind === "ciaza" && scenario.dueDate > today
        ? post<PregnancyCalcResult>("/api/pregnancy", {
            parent: mother,
            illnessFrom: today,
            illnessTo: addDays(scenario.dueDate, -1),
            codeB: true,
            dueDate: scenario.dueDate,
            today,
          }).catch(() => undefined)
        : Promise.resolve(undefined);

    Promise.all([calcP, pregP])
      .then(([calc, pregnancy]) => !cancelled && setState({ loading: false, calc, pregnancy }))
      .catch((e: Error) => !cancelled && setState({ loading: false, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [parents, scenario, plan]);

  return { ...state, loading: hasData && state.loading, hasData };
}

export type { EligibilityResult };
