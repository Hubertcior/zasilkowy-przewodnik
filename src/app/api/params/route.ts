import { connection } from "next/server";
import { ParamsSchema } from "@/engine/params";
import { isAdmin, unauthorized } from "@/server/adminAuth";
import { getParamsStore } from "@/server/paramsStore";
import { bumpVersion } from "@/server/paramsVersion";

/** GET /api/params: current benefit parameters. */
export async function GET() {
  await connection(); // always serve live params, never prerender
  return Response.json(await getParamsStore().get());
}

/**
 * PUT /api/params: replace parameters (admin: x-admin-key header or admin session cookie; validated with zod).
 * Optional headers: x-admin-author, x-change-note (URI-encoded). If `version` is unchanged it is incremented.
 */
export async function PUT(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "validation", issues: [{ path: [], message: "Nieprawidłowy JSON" }] }, { status: 400 });
  }

  const parsed = ParamsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  }

  const store = getParamsStore();
  const current = await store.get();
  const next = parsed.data.version === current.version ? { ...parsed.data, version: bumpVersion(current.version) } : parsed.data;
  const author = request.headers.get("x-admin-author")?.trim() || "admin";
  const rawNote = request.headers.get("x-change-note");
  let note: string | undefined;
  try {
    note = rawNote ? decodeURIComponent(rawNote).slice(0, 500) : undefined;
  } catch {
    note = rawNote?.slice(0, 500);
  }
  return Response.json(await store.put(next, author, note));
}
