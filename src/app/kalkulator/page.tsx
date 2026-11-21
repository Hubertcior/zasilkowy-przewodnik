import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Kalkulator – Zasiłkowy Przewodnik" };

export default function Page() {
  return <ComingSoon title="Kalkulator" task="KAN-26">Zintegrowany kalkulator zasiłku dla obojga rodziców: opcje, oś czasu urlopów, kwoty i porównanie wariantów.</ComingSoon>;
}
