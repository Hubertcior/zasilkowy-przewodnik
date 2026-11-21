import { isAdmin, unauthorized } from "@/server/adminAuth";
import { getParamsStore } from "@/server/paramsStore";

/** POST /api/params/reset: restore defaults from params.default.json (admin only). */
export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  const author = request.headers.get("x-admin-author")?.trim() || "admin";
  return Response.json(await getParamsStore().reset(author));
}
