import { connection } from "next/server";
import { listCases } from "@/server/cases";

/** GET /api/cases: list of example cases. */
export async function GET() {
  await connection();
  return Response.json(await listCases());
}
