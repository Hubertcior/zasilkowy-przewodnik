import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LINK_GROUPS, LINKS_CHECKED_AT } from "@/data/links";

export const metadata: Metadata = { title: "Przydatne linki – Zasiłkowy Przewodnik" };

export default function UsefulLinksPage() {
  return (
    <PageContainer className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Przydatne linki</h1>
        <p className="text-muted-foreground max-w-3xl text-sm">
          Oficjalne strony ZUS, ministerstwa, Państwowej Inspekcji Pracy i rejestru stanu cywilnego. W razie wątpliwości rozstrzygają informacje z tych
          źródeł i decyzja ZUS. Linki sprawdzone {LINKS_CHECKED_AT}.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {LINK_GROUPS.map((g) => (
          <Card key={g.title}>
            <CardHeader>
              <CardTitle className="text-base">{g.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {g.links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-start gap-1 font-medium underline underline-offset-2">
                      {l.label} <ExternalLink className="mt-1 size-3 shrink-0" aria-hidden />
                    </a>
                    <p className="text-muted-foreground text-sm">{l.description}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
