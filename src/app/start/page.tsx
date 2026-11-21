import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Wprowadź dane – Zasiłkowy Przewodnik" };

export default function Page() {
  return <ComingSoon title="Wprowadź dane" task="KAN-24">Kreator danych: ręczne wprowadzenie sytuacji (pola jak w zaświadczeniu Z-3 i wniosku ZAM).</ComingSoon>;
}
