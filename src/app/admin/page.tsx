import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = { title: "Panel administracyjny – Zasiłkowy Przewodnik", robots: { index: false } };

export default function AdminPage() {
  return (
    <PageContainer className="max-w-7xl">
      <AdminPanel />
    </PageContainer>
  );
}
