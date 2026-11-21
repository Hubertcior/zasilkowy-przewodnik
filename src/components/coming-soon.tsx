import { Construction } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { PageContainer } from "./page-container";

/** Placeholder for sections built in later tasks. */
export function ComingSoon({ title, task, children }: { title: string; task: string; children?: React.ReactNode }) {
  return (
    <PageContainer>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <EmptyState
        icon={<Construction />}
        title="Sekcja w przygotowaniu"
        action={
          <Button asChild variant="outline">
            <Link href="/sprawy">Zobacz przykładowe sprawy</Link>
          </Button>
        }
      >
        {children ?? "Ta część przewodnika jest w budowie."} <span className="sr-only">({task})</span>
      </EmptyState>
    </PageContainer>
  );
}
