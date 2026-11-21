import { promises as fs } from "node:fs";
import path from "node:path";
import { CaseFileSchema } from "@/engine/schemas";
import type { CaseFile } from "@/engine/types";
import { fixtureCases } from "@/fixtures/cases";

// Example cases: synthetic fixtures (in repo) + private ZUS test cases read from disk (never committed).
// Private dir: $CASES_DIR or ./cases-private (gitignored).

export type CaseOrigin = "synthetic" | "private";

export interface LoadedCase {
  origin: CaseOrigin;
  data: CaseFile;
}

export interface CaseSummary {
  id: string;
  title: string;
  description: string;
  synthetic: boolean;
  origin: CaseOrigin;
  hasExpected: boolean;
}

export function privateCasesDir(): string {
  return process.env.CASES_DIR ?? path.join(process.cwd(), "cases-private");
}

function parseFixtures(): LoadedCase[] {
  return fixtureCases.map((raw) => {
    const parsed = CaseFileSchema.parse(raw);
    return { origin: "synthetic" as const, data: parsed as CaseFile };
  });
}

async function readPrivate(): Promise<{ cases: LoadedCase[]; errors: string[] }> {
  const dir = privateCasesDir();
  let files: string[];
  try {
    // turbopackIgnore: private cases are read at runtime only and must never be traced into the build output.
    files = (await fs.readdir(/*turbopackIgnore: true*/ dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return { cases: [], errors: [] };
  }
  const cases: LoadedCase[] = [];
  const errors: string[] = [];
  for (const f of files.sort()) {
    try {
      const parsed = CaseFileSchema.safeParse(JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ dir, f), "utf8")));
      if (parsed.success) cases.push({ origin: "private", data: parsed.data as CaseFile });
      else errors.push(`${f}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    } catch (e) {
      errors.push(`${f}: ${(e as Error).message}`);
    }
  }
  return { cases, errors };
}

export async function loadAllCases(): Promise<{ cases: LoadedCase[]; errors: string[] }> {
  const priv = await readPrivate();
  return { cases: [...parseFixtures(), ...priv.cases], errors: priv.errors };
}

export async function listCases(): Promise<CaseSummary[]> {
  const { cases } = await loadAllCases();
  return cases.map(({ origin, data }) => ({
    id: data.id,
    title: data.title,
    description: data.description,
    synthetic: data.synthetic,
    origin,
    hasExpected: !!data.expected,
  }));
}

export async function getCase(id: string): Promise<(CaseFile & { origin: CaseOrigin }) | undefined> {
  const { cases } = await loadAllCases();
  const found = cases.find((c) => c.data.id === id);
  return found ? { ...found.data, origin: found.origin } : undefined;
}
