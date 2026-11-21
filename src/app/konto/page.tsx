import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Moje konto (PUE – symulacja) – Zasiłkowy Przewodnik" };

export default function Page() {
  return <ComingSoon title="Moje konto (PUE – symulacja)" task="KAN-29">Symulacja konta PUE/eZUS: dane konta, e-ZLA, zaświadczenie o zadłużeniu i „Zapytaj ZUS”.</ComingSoon>;
}
