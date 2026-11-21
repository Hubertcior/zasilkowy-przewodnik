import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { ApplicationsView } from "./applications-view";

export const metadata: Metadata = { title: "Wnioski – Zasiłkowy Przewodnik" };

export default function Page() {
  return (
    <PageContainer>
      <ApplicationsView />
    </PageContainer>
  );
}
