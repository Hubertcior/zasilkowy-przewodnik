import { isAdmin, usingDefaultPassword } from "@/server/adminAuth";
import { getParamsStore } from "@/server/paramsStore";

/** GET /api/admin/session – is the admin logged in, which store is used (persistence info for the UI). */
export async function GET(request: Request) {
  if (!isAdmin(request)) return Response.json({ admin: false }, { status: 401 });
  const store = getParamsStore();
  return Response.json({ admin: true, store: store.kind, persistent: store.kind !== "memory", defaultPassword: usingDefaultPassword() });
}
