import type { z } from "zod";

/** Common API error format: 400 { error: 'validation', issues }, 500 { error }. */
export function validationError(issues: unknown) {
  return Response.json({ error: "validation", issues }, { status: 400 });
}

export function serverError(e: unknown) {
  console.error("[api]", e);
  return Response.json({ error: e instanceof Error ? e.message : "Błąd serwera" }, { status: 500 });
}

/** Parse and validate a JSON body. Returns either the data or a ready 400 response. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<{ data: z.infer<S> } | { response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: validationError([{ code: "invalid_json", message: "Nieprawidłowy JSON", path: [] }]) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: validationError(parsed.error.issues) };
  return { data: parsed.data };
}

/** Placeholder for simulated integrations that later tasks will implement. */
export function notImplemented(name: string, task: string) {
  return Response.json(
    { error: "not_implemented", message: `Symulacja „${name}” zostanie dodana w zadaniu ${task}.`, simulation: true },
    { status: 501 },
  );
}
