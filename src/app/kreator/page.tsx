import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { WizardFormView } from "./wizard-form";

export const metadata: Metadata = { title: "Wprowadź dane – Zasiłkowy Przewodnik" };

export default function WizardPage() {
  return (
    <PageContainer className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Wprowadź dane samodzielnie</h1>
        <p className="text-muted-foreground">Kilka kroków – możesz podać dane szacunkowo i poprawić je później.</p>
      </div>
      <WizardFormView />
    </PageContainer>
  );
}
