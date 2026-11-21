import { connection } from "next/server";
import { getParamsStore } from "@/server/paramsStore";

/** GET /api/params/history: change log (newest first). */
export async function GET() {
  await connection(); // always serve live params, never prerender
  return Response.json(await getParamsStore().history());
}
