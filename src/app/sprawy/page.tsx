import type { Metadata } from "next";
import { CasesBrowser } from "./cases-browser";

export const metadata: Metadata = { title: "Przykładowe sprawy – Zasiłkowy Przewodnik" };

export default function CasesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
      <CasesBrowser />
    </main>
  );
}
