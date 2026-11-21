import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { LoginFlow } from "./login-flow";

export const metadata: Metadata = {
  title: "Logowanie (symulacja mObywatel) – Zasiłkowy Przewodnik",
};

export default function LoginPage() {
  return (
    <PageContainer>
      <LoginFlow />
    </PageContainer>
  );
}
