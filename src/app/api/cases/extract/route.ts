import Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";
import { aiEnabled, EXTRACT_LIMITS, extractFromPdfs } from "@/server/extract";

// [AI] KAN-36 – Node runtime (default for route handlers); PDFs are kept in memory only.
export const maxDuration = 120;

/** GET /api/cases/extract → { enabled } – whether AI reading is configured (ANTHROPIC_API_KEY). */
export async function GET() {
  await connection();
  return Response.json({ enabled: aiEnabled(), limits: EXTRACT_LIMITS });
}

/**
 * POST /api/cases/extract (multipart, field "files", 1–5 PDF, ≤ 10 MB each) → { extraction, model, ai: true }.
 * 503 when AI is not configured, 400 on invalid files, 422 when the model declines, 502 when no valid data was read.
 */
export async function POST(request: Request) {
  if (!aiEnabled()) return Response.json({ error: "ai_disabled", message: "Odczyt PDF przez AI nie jest skonfigurowany." }, { status: 503 });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "validation", message: "Oczekiwano formularza multipart z plikami PDF." }, { status: 400 });
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0 || files.length > EXTRACT_LIMITS.maxFiles)
    return Response.json({ error: "validation", message: `Wgraj od 1 do ${EXTRACT_LIMITS.maxFiles} plików PDF.` }, { status: 400 });
  let total = 0;
  const buffers: { name: string; data: Buffer }[] = [];
  for (const f of files) {
    if (f.size > EXTRACT_LIMITS.maxFileBytes) return Response.json({ error: "validation", message: `Plik ${f.name} jest większy niż 10 MB.` }, { status: 400 });
    total += f.size;
    const data = Buffer.from(await f.arrayBuffer());
    if (data.subarray(0, 5).toString("latin1") !== "%PDF-") return Response.json({ error: "validation", message: `Plik ${f.name} nie jest plikiem PDF.` }, { status: 400 });
    buffers.push({ name: f.name, data });
  }
  if (total > EXTRACT_LIMITS.maxTotalBytes) return Response.json({ error: "validation", message: "Łączny rozmiar plików przekracza 25 MB." }, { status: 400 });

  try {
    const out = await extractFromPdfs(buffers);
    if (!out.ok) return Response.json({ error: "extract_failed", message: out.message }, { status: out.status });
    return Response.json({ ai: true, model: out.model, extraction: out.extraction });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "rate_limited", message: "Za dużo zapytań do AI – spróbuj za chwilę." }, { status: 429 });
    if (e instanceof Anthropic.AuthenticationError) return Response.json({ error: "ai_auth", message: "Nieprawidłowy klucz API AI." }, { status: 503 });
    if (e instanceof Anthropic.BadRequestError) return Response.json({ error: "ai_bad_request", message: "Model nie przyjął dokumentów (np. uszkodzony PDF)." }, { status: 422 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: "ai_error", message: "Usługa AI jest chwilowo niedostępna." }, { status: 502 });
    throw e;
  }
}
