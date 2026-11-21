import { connection } from "next/server";
import { ParamsSchema } from "@/engine/params";
import { isAdmin, unauthorized } from "@/server/adminAuth";
import { getParamsStore } from "@/server/paramsStore";

/** GET /api/params: current benefit parameters. */
export async function GET() {
  await connection(); // always serve live params, never prerender
  return Response.json(await getParamsStore().get());
}

/** PUT /api/params: replace parameters (admin only, validated with zod). */
export async function PUT(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  const parsed = ParamsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Nieprawidłowe parametry", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const author = request.headers.get("x-admin-author")?.trim() || "admin";
  return Response.json(await getParamsStore().put(parsed.data, author));
}
