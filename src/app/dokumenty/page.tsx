import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Co i gdzie złożyć – Zasiłkowy Przewodnik" };

export default function Page() {
  return <ComingSoon title="Co i gdzie złożyć" task="KAN-27">Lista dokumentów, terminy, płatnik czy ZUS i ścieżka online – dopasowane do Twojej sytuacji.</ComingSoon>;
}
