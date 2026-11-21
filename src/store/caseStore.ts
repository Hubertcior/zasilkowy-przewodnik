"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LeavePlan, ParentData, Scenario } from "@/engine/types";

// Client-side case data shared by all screens. KAN-24 extends it (manual entry wizard, example cases).

export type DataSource = "mobywatel" | "manual" | "case";

export interface CaseState {
  source: DataSource | null;
  /** Display name of the logged-in (simulated) person or the loaded case. */
  displayName?: string;
  personaId?: string;
  caseId?: string;
  parents: ParentData[];
  scenario?: Scenario;
  plan?: LeavePlan;
  setFromPersona: (p: { personaId: string; displayName: string; parents: ParentData[]; scenario: Scenario }) => void;
  setPlan: (plan: LeavePlan | undefined) => void;
  reset: () => void;
}

const empty = { source: null, displayName: undefined, personaId: undefined, caseId: undefined, parents: [], scenario: undefined, plan: undefined };

export const useCaseStore = create<CaseState>()(
  persist(
    (set) => ({
      ...empty,
      setFromPersona: ({ personaId, displayName, parents, scenario }) =>
        set({ ...empty, source: "mobywatel", personaId, displayName, parents, scenario }),
      setPlan: (plan) => set({ plan }),
      reset: () => set({ ...empty }),
    }),
    {
      name: "zasilkowy-przewodnik-case",
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
    },
  ),
);
