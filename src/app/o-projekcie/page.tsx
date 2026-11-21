import { ExternalLink, Film } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { PROJECT_LINKS, youtubeEmbed } from "@/data/project";

export const metadata: Metadata = { title: "O projekcie – Zasiłkowy Przewodnik" };

const LINKS: { label: string; url: string }[] = [
  { label: "Szczegółowy opis projektu", url: PROJECT_LINKS.descriptionUrl },
  { label: "Prezentacja", url: PROJECT_LINKS.presentationUrl },
  { label: "Repozytorium kodu", url: PROJECT_LINKS.repoUrl },
  ...(PROJECT_LINKS.demoUrl ? [{ label: "Demo online", url: PROJECT_LINKS.demoUrl }] : []),
];

export default function AboutPage() {
  const video = PROJECT_LINKS.videoUrl;
  const embed = video ? youtubeEmbed(video) : null;
  return (
    <PageContainer className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">O projekcie</h1>
        <p className="text-muted-foreground max-w-3xl">
          Zasiłkowy Przewodnik Przyszłego Rodzica – aplikacja przygotowana na HackNation 2026 (zadanie ZUS). Ustala prawo do zasiłków, wylicza ich wysokość w jednym
          kalkulatorze i prowadzi przez wnioski. Wynik ma charakter informacyjny i nie zastępuje decyzji ZUS.
        </p>
      </header>

      <section aria-labelledby="film-h" className="space-y-3">
        <h2 id="film-h" className="text-lg font-semibold">
          Film (do 3 minut)
        </h2>
        {embed ? (
          <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-xl border">
            <iframe
              src={embed}
              title="Film o projekcie Zasiłkowy Przewodnik"
              className="size-full"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : video ? (
          <video src={video} controls className="w-full max-w-4xl rounded-xl border" />
        ) : (
          <EmptyState icon={<Film />} title="Film wkrótce" className="max-w-4xl">
            Nagranie pokazujące projekt i jego użycie pojawi się tutaj po publikacji.
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="links-h" className="space-y-2">
        <h2 id="links-h" className="text-lg font-semibold">
          Materiały
        </h2>
        <ul className="space-y-1">
          {LINKS.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 underline underline-offset-2">
                {l.label} <ExternalLink className="size-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
