import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Trudne sytuacje – Zasiłkowy Przewodnik" };

export default function Page() {
  return <ComingSoon title="Trudne sytuacje" task="KAN-31">Wsparcie w sytuacjach szczególnych i organizacje charytatywne.</ComingSoon>;
}
