import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { SituationView } from "./situation-view";

export const metadata: Metadata = { title: "Moja sytuacja – Zasiłkowy Przewodnik" };

export default function SituationPage() {
  return (
    <PageContainer>
      <SituationView />
    </PageContainer>
  );
}
