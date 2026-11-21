"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CaseFile, LeavePlan, ParentData, Scenario } from "@/engine/types";

// Client-side case data shared by all screens; all three entry paths (mObywatel, manual wizard, example case)
// end in the same model. Persisted in sessionStorage only (data stays in this browser tab).

export type DataSource = "mobywatel" | "reczne" | "sprawa";
export type CaseOrigin = "synthetic" | "private" | "upload";

export interface CaseState {
  source: DataSource | null;
  /** Display name of the logged-in (simulated) person or the loaded case. */
  displayName?: string;
  personaId?: string;
  caseId?: string;
  parents: ParentData[];
  scenario?: Scenario;
  plan?: LeavePlan;
  /** Loaded example case (to compare with the expected ZUS result). */
  caseFile?: CaseFile;
  caseOrigin?: CaseOrigin;
  setFromPersona: (p: { personaId: string; displayName: string; parents: ParentData[]; scenario: Scenario }) => void;
  setFromCase: (c: CaseFile, origin: CaseOrigin) => void;
  setManual: (p: { parents: ParentData[]; scenario: Scenario; plan?: LeavePlan }) => void;
  updatePlan: (plan: LeavePlan | undefined) => void;
  reset: () => void;
}

const empty = {
  source: null,
  displayName: undefined,
  personaId: undefined,
  caseId: undefined,
  parents: [],
  scenario: undefined,
  plan: undefined,
  caseFile: undefined,
  caseOrigin: undefined,
};

export const useCaseStore = create<CaseState>()(
  persist(
    (set) => ({
      ...empty,
      setFromPersona: ({ personaId, displayName, parents, scenario }) =>
        set({ ...empty, source: "mobywatel", personaId, displayName, parents, scenario }),
      setFromCase: (c, origin) =>
        set({ ...empty, source: "sprawa", caseId: c.id, displayName: c.title, parents: c.parents, scenario: c.scenario, plan: c.plan, caseFile: c, caseOrigin: origin }),
      setManual: ({ parents, scenario, plan }) => set({ ...empty, source: "reczne", displayName: "Dane wprowadzone samodzielnie", parents, scenario, plan }),
      updatePlan: (plan) => set({ plan }),
      reset: () => set({ ...empty }),
    }),
    {
      name: "zasilkowy-przewodnik-case",
      storage: createJSONStorage(() => sessionStorage),
      version: 2,
    },
  ),
);
