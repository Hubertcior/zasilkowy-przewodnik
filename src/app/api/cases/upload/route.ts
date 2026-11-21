import { CaseFileSchema } from "@/engine/schemas";
import { validationError } from "@/server/http";

const MAX_BYTES = 1_000_000;

/**
 * POST /api/cases/upload – validate an uploaded case (.json, CaseFile format).
 * Accepts multipart/form-data (field "file") or a raw JSON body. Nothing is stored on the server.
 */
export async function POST(request: Request) {
  let text: string;
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("multipart/form-data")) {
      const file = (await request.formData()).get("file");
      if (!(file instanceof File)) return validationError([{ path: ["file"], message: "Brak pliku w polu „file”" }]);
      if (!file.name.toLowerCase().endsWith(".json")) return validationError([{ path: ["file"], message: "Oczekiwano pliku .json" }]);
      if (file.size > MAX_BYTES) return validationError([{ path: ["file"], message: "Plik jest za duży (maks. 1 MB)" }]);
      text = await file.text();
    } else {
      text = await request.text();
      if (text.length > MAX_BYTES) return validationError([{ path: [], message: "Treść jest za duża (maks. 1 MB)" }]);
    }
  } catch {
    return validationError([{ path: [], message: "Nie udało się odczytać pliku" }]);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return validationError([{ code: "invalid_json", path: [], message: "Plik nie jest poprawnym JSON-em" }]);
  }
  const parsed = CaseFileSchema.safeParse(json);
  if (!parsed.success) return validationError(parsed.error.issues);
  return Response.json({ ...parsed.data, origin: "upload" });
}
