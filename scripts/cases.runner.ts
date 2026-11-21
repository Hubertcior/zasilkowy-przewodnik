import { expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { compareCase } from "@/engine/cases";
import { ParamsSchema } from "@/engine/params";
import { loadAllCases, privateCasesDir } from "@/server/cases";

// Runner: compares the engine with the expected ZUS decision for every case. Exit code ≠ 0 on any difference.

const fmt = (n: number | undefined) => (n === undefined ? "—" : n.toFixed(2).replace(".", ","));
const dec = (g: boolean | undefined) => (g === undefined ? "—" : g ? "TAK" : "NIE");

it("example cases match expected ZUS results", async () => {
  const params = ParamsSchema.parse(defaults);
  const { cases, errors } = await loadAllCases();
  const rows = cases.map(({ origin, data }) => ({ origin, cmp: compareCase(data, params) }));

  const header = ["sprawa", "źródło", "decyzja oczek./obl.", "podstawa oczek./obl.", "kwota oczek./obl.", "wynik"];
  const table = rows.map(({ origin, cmp }) => [
    cmp.id,
    origin === "private" ? "ZUS (lokalnie)" : "syntetyczna",
    `${dec(cmp.expected?.granted)} / ${dec(cmp.computed.granted)}`,
    `${fmt(cmp.expected?.base)} / ${fmt(cmp.computed.base)}`,
    `${fmt(cmp.expected?.monthly)} / ${fmt(cmp.computed.monthly)}`,
    cmp.expected ? (cmp.ok ? "OK" : "RÓŻNICA") : "brak oczekiwanych",
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...table.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((c, i) => c.padEnd(widths[i])).join(" │ ");
  const out = [line(header), widths.map((w) => "─".repeat(w)).join("─┼─"), ...table.map(line)];
  for (const { cmp } of rows) for (const d of cmp.diffs) out.push(`  ✗ ${cmp.id}: ${d}`);
  for (const e of errors) out.push(`  ⚠ niepoprawny plik w ${privateCasesDir()}: ${e}`);
  const failed = rows.filter((r) => !r.cmp.ok).length;
  out.push("", `Spraw: ${rows.length} (prywatnych: ${rows.filter((r) => r.origin === "private").length}), różnic: ${failed}`);
  console.log(`\n${out.join("\n")}\n`);

  expect(errors, "niepoprawne pliki spraw").toEqual([]);
  expect(failed, "sprawy z różnicą").toBe(0);
});
