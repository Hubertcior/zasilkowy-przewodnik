import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Moje konto (PUE – symulacja) – Zasiłkowy Przewodnik" };

export default function Page() {
  return (
    <PageContainer>
      <AccountView />
    </PageContainer>
  );
}
