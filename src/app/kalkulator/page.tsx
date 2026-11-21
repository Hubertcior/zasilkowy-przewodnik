import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { Calculator } from "./calculator";

export const metadata: Metadata = { title: "Kalkulator zasiłku – Zasiłkowy Przewodnik" };

export default function CalculatorPage() {
  return (
    <PageContainer className="max-w-7xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Kalkulator zasiłku</h1>
        <p className="text-muted-foreground">
          Jeden kalkulator dla wszystkich sytuacji: liczba dzieci, „Za życiem”, wcześniak, adopcja, podział urlopów i łączenie z pracą.
        </p>
      </div>
      <Calculator />
    </PageContainer>
  );
}
