import type { CaseFile } from "@/engine/types";

// Example cases loader. KAN-22 fills src/fixtures/cases with synthetic cases and upload support.

export interface CaseSummary {
  id: string;
  title: string;
  description: string;
  synthetic: boolean;
}

export async function listCases(): Promise<CaseSummary[]> {
  return [];
}

export async function getCase(id: string): Promise<CaseFile | undefined> {
  void id;
  return undefined;
}
