import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { FilingView } from "./filing-view";

export const metadata: Metadata = { title: "Co i gdzie złożyć – Zasiłkowy Przewodnik" };

export default function FilingPage() {
  return (
    <PageContainer className="max-w-7xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Co i gdzie złożyć</h1>
        <p className="text-muted-foreground">Dokumenty, terminy i miejsce złożenia – u pracodawcy, zleceniodawcy czy w ZUS – dopasowane do Twojej sytuacji.</p>
      </div>
      <FilingView />
    </PageContainer>
  );
}
