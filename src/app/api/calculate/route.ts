import { calculateAll } from "@/engine/calculate";
import { CalculateRequestSchema } from "@/engine/schemas";
import { parseBody, serverError } from "@/server/http";
import { getParamsStore } from "@/server/paramsStore";

/** POST /api/calculate: { parents, scenario, plan?, baseOverride?, today? } → bases, eligibility, entitlement, schedule, warnings. */
export async function POST(request: Request) {
  const body = await parseBody(request, CalculateRequestSchema);
  if ("response" in body) return body.response;
  try {
    return Response.json(calculateAll(body.data, await getParamsStore().get()));
  } catch (e) {
    return serverError(e);
  }
}
