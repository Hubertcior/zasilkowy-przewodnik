import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ExtractionSchema, parseExtraction, type Extraction } from "@/lib/extraction";

// KAN-36 [AI]: reads uploaded PDFs (ZAM, Z-3, Z-3a, certificates) with Claude and returns case data for the user to
// verify. Files and results are processed in memory only – nothing is stored on the server.

export const EXTRACT_LIMITS = { maxFiles: 5, maxFileBytes: 10 * 1024 * 1024, maxTotalBytes: 25 * 1024 * 1024 } as const;
/** Override with ANTHROPIC_MODEL; default per Anthropic guidance for new code. */
export const EXTRACT_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const SYSTEM = `Odczytujesz polskie dokumenty dotyczące zasiłków z ubezpieczenia chorobowego (wniosek ZAM, zaświadczenia płatnika Z-3 i Z-3a, zaświadczenia lekarskie, odpis aktu urodzenia).
Wypełnij schemat danymi z dokumentów. Zasady:
- Nie zgaduj. Jeśli informacji nie ma w dokumentach, ustaw value na null, confidence na "niska" i sourceQuote na null.
- sourceQuote to krótki, dosłowny cytat z dokumentu, z którego odczytano wartość.
- confidence: "wysoka" gdy wartość jest wprost w dokumencie, "srednia" gdy trzeba ją wywnioskować z kilku miejsc, "niska" gdy jest niepewna lub nieczytelna.
- Daty w formacie RRRR-MM-DD, miesiące wynagrodzeń w formacie RRRR-MM, kwoty jako liczby w złotych (kropka dziesiętna).
- incomes: wynagrodzenie brutto (przychód stanowiący podstawę wymiaru składek) z kolejnych miesięcy z Z-3/Z-3a, najwyżej 12 ostatnich.
- insuranceTitle: umowa_o_prace, zlecenie, dzialalnosc albo inne. sickness: obowiazkowe (pracownik), dobrowolne albo brak.
- scenario i eventDate: ciaza + przewidywana data porodu, urodzenie + data porodu, adopcja/piecza + data przyjęcia dziecka.
- longApplication: true, jeśli we wniosku ZAM zaznaczono pełny wymiar urlopu macierzyńskiego i rodzicielskiego (81,5%).
- W notes zapisz krótko ważne uwagi (np. nieczytelne fragmenty, sprzeczne dane między dokumentami).`;

export type ExtractOutcome =
  | { ok: true; extraction: Extraction; model: string }
  | { ok: false; status: 422 | 502; message: string };

interface ExtractDeps {
  client?: Anthropic;
}

/**
 * Sends the PDFs to Claude as base64 document blocks with a structured-output schema. The response is validated again
 * with zod (parseExtraction); on a validation error the request is retried once with the error message.
 */
export async function extractFromPdfs(files: { name: string; data: Buffer }[], deps: ExtractDeps = {}): Promise<ExtractOutcome> {
  const client = deps.client ?? new Anthropic();
  const docs: Anthropic.Beta.BetaContentBlockParam[] = files.map((f) => ({
    type: "document",
    source: { type: "base64", media_type: "application/pdf", data: f.data.toString("base64") },
    title: f.name.slice(0, 200),
  }));
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const instruction =
      "Odczytaj dane sprawy z powyższych dokumentów zgodnie ze schematem." +
      (lastError ? `\n\nPoprzednia odpowiedź nie przeszła walidacji: ${lastError}. Popraw ją.` : "");
    const response = await client.beta.messages.parse({
      model: EXTRACT_MODEL,
      max_tokens: 16000,
      // Refusals are re-run server-side on the model Anthropic recommends for the category.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: [...docs, { type: "text", text: instruction }] }],
      output_config: { format: betaZodOutputFormat(ExtractionSchema) },
    });
    if (response.stop_reason === "refusal") {
      return { ok: false, status: 422, message: "Model odmówił odczytu tych dokumentów. Wprowadź dane ręcznie." };
    }
    if (response.stop_reason === "max_tokens") {
      lastError = "odpowiedź została ucięta (za długa)";
      continue;
    }
    const parsed = parseExtraction(response.parsed_output);
    if (parsed.ok) return { ok: true, extraction: parsed.data, model: response.model };
    lastError = parsed.error;
  }
  return { ok: false, status: 502, message: `Nie udało się odczytać danych z dokumentów (${lastError}). Wprowadź dane ręcznie.` };
}
