import { z } from "zod";
import { FormValuesSchema } from "@/forms/validate";
import { parseBody } from "@/server/http";
import { submitApplication } from "@/server/mocks/applications";

const SubmitSchema = z.object({ formId: z.string().min(1).max(60), values: FormValuesSchema });

/**
 * POST /api/mock/wnioski – SYMULACJA wysyłki wniosku do pracodawcy / ZUS / USC.
 * { formId, values } → 201 { caseNumber, recipient, timeline[] } | 400 { error: "validation", fields } | 404.
 */
export async function POST(request: Request) {
  const body = await parseBody(request, SubmitSchema);
  if ("response" in body) return body.response;
  const out = submitApplication(body.data);
  if (!out.ok) {
    return out.status === 404
      ? Response.json({ error: "not_found", message: out.errors }, { status: 404 })
      : Response.json({ error: "validation", fields: out.errors }, { status: 400 });
  }
  return Response.json(out.result, { status: 201 });
}
