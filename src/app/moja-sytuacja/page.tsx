import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { SituationPlaceholder } from "./situation-placeholder";

export const metadata: Metadata = { title: "Moja sytuacja – Zasiłkowy Przewodnik" };

export default function SituationPage() {
  return (
    <PageContainer>
      <SituationPlaceholder />
    </PageContainer>
  );
}
