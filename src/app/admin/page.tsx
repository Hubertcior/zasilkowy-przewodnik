import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Panel administracyjny – Zasiłkowy Przewodnik" };

export default function Page() {
  return <ComingSoon title="Panel administracyjny" task="KAN-28">Edycja parametrów zasiłków, historia zmian i reset.</ComingSoon>;
}
