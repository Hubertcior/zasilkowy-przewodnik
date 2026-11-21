import type { Metadata } from "next";
import { SituationPlaceholder } from "./situation-placeholder";

export const metadata: Metadata = { title: "Moja sytuacja – Zasiłkowy Przewodnik" };

export default function SituationPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
      <SituationPlaceholder />
    </main>
  );
}
