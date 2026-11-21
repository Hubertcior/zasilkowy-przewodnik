import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = { title: "Logowanie administratora – Zasiłkowy Przewodnik", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <PageContainer className="flex items-center">
      <AdminLoginForm />
    </PageContainer>
  );
}
