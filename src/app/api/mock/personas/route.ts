import { connection } from "next/server";
import { personaSummaries } from "@/server/mocks/personas";

/** GET /api/mock/personas – SYMULACJA: lista fikcyjnych osób do wyboru na ekranie logowania. */
export async function GET() {
  await connection();
  return Response.json(personaSummaries());
}
