import { compareCase } from "@/engine/cases";
import { CaseFileSchema } from "@/engine/schemas";
import type { CaseFile } from "@/engine/types";
import { parseBody, serverError } from "@/server/http";
import { getParamsStore } from "@/server/paramsStore";

/** POST /api/cases/compare: CaseFile → our calculation vs the expected ZUS result. */
export async function POST(request: Request) {
  const body = await parseBody(request, CaseFileSchema);
  if ("response" in body) return body.response;
  try {
    return Response.json(compareCase(body.data as CaseFile, await getParamsStore().get()));
  } catch (e) {
    return serverError(e);
  }
}
