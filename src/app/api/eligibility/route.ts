import { checkEligibility } from "@/engine/eligibility";
import { EligibilityRequestSchema } from "@/engine/schemas";
import { parseBody, serverError } from "@/server/http";
import { getParamsStore } from "@/server/paramsStore";

/** POST /api/eligibility: { parents, scenario, onDate? } → checkEligibility per parent. */
export async function POST(request: Request) {
  const body = await parseBody(request, EligibilityRequestSchema);
  if ("response" in body) return body.response;
  try {
    const params = await getParamsStore().get();
    const { parents, scenario, onDate } = body.data;
    const result = Object.fromEntries(parents.map((p) => [p.role, checkEligibility(p, scenario, params, onDate)]));
    return Response.json(result);
  } catch (e) {
    return serverError(e);
  }
}
