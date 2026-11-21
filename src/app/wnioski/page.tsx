import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Wnioski – Zasiłkowy Przewodnik" };

export default function Page() {
  return <ComingSoon title="Wnioski" task="KAN-30">Kreator wniosków o urlopy i zasiłek (ZAM) wypełniany danymi z kalkulatora.</ComingSoon>;
}
