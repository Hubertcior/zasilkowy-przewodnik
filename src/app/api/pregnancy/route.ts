import { calculatePregnancy } from "@/engine/calculate";
import { PregnancyRequestSchema } from "@/engine/schemas";
import { parseBody, serverError, validationError } from "@/server/http";
import { getParamsStore } from "@/server/paramsStore";

/** POST /api/pregnancy: pregnancy benefits (sick pay, sickness benefit, benefit equal to maternity) + warnings. */
export async function POST(request: Request) {
  const body = await parseBody(request, PregnancyRequestSchema);
  if ("response" in body) return body.response;
  if (body.data.illnessTo < body.data.illnessFrom) {
    return validationError([{ code: "custom", path: ["illnessTo"], message: "Data końca niezdolności jest wcześniejsza niż początek" }]);
  }
  try {
    return Response.json(calculatePregnancy(body.data, await getParamsStore().get()));
  } catch (e) {
    return serverError(e);
  }
}
