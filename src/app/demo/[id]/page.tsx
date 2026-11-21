import { buildPersonas } from "@/server/mocks/personas";
import { PageContainer } from "@/components/page-container";
import { DemoLoader } from "./demo-loader";

// Deep link for presentations: /demo/anna logs in the persona (simulation) and opens "Moja sytuacja".
export function generateStaticParams() {
  return buildPersonas("2026-01-01").map((p) => ({ id: p.id }));
}

export default async function DemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <DemoLoader id={id} />
    </PageContainer>
  );
}
