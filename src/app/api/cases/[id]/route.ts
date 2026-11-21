import { getCase } from "@/server/cases";

/** GET /api/cases/:id: example case details. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const found = await getCase(id);
  if (!found) return Response.json({ error: "not_found", message: `Nie znaleziono sprawy „${id}”` }, { status: 404 });
  return Response.json(found);
}
