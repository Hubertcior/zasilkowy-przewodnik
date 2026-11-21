import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { CasesBrowser } from "./cases-browser";

export const metadata: Metadata = { title: "Przykładowe sprawy – Zasiłkowy Przewodnik" };

export default function CasesPage() {
  return (
    <PageContainer>
      <CasesBrowser />
    </PageContainer>
  );
}
