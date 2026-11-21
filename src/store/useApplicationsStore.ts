"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SubmissionResult } from "@/server/mocks/applications";

// Submitted (simulated) applications: only the confirmation is kept – never the form values,
// so the bank account number from ZAM is not stored anywhere in the browser.

export interface SubmittedApplication extends Omit<SubmissionResult, "simulation"> {
  role: "matka" | "ojciec";
}

interface ApplicationsState {
  submitted: SubmittedApplication[];
  add: (a: SubmittedApplication) => void;
  clear: () => void;
}

export const useApplicationsStore = create<ApplicationsState>()(
  persist(
    (set) => ({
      submitted: [],
      add: (a) => set((s) => ({ submitted: [a, ...s.submitted].slice(0, 30) })),
      clear: () => set({ submitted: [] }),
    }),
    { name: "zasilkowy-przewodnik-wnioski", storage: createJSONStorage(() => sessionStorage), version: 1 },
  ),
);
