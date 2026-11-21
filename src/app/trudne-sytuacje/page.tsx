import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { DifficultSituations } from "./difficult-situations";

export const metadata: Metadata = { title: "Trudne sytuacje – Zasiłkowy Przewodnik" };

export default function Page() {
  return (
    <PageContainer>
      <DifficultSituations />
    </PageContainer>
  );
}
