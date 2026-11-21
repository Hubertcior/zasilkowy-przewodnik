import { Calculator, FileText, FolderOpen, UserRound } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: UserRound, title: "Moja sytuacja", text: "Czy masz ubezpieczenie, kto wypłaci zasiłek i na co uważać." },
  { icon: Calculator, title: "Kalkulator", text: "Okres i wysokość zasiłku dla obojga rodziców – w jednym miejscu." },
  { icon: FileText, title: "Co i gdzie złożyć", text: "Dokumenty, terminy i ścieżka online dopasowane do Ciebie." },
  { icon: FolderOpen, title: "Przykładowe sprawy", text: "Sprawdź wyliczenia na gotowych przykładach albo wgraj własną sprawę." },
];

export default function Home() {
  return (
    <PageContainer className="space-y-10">
      <section className="space-y-5 pt-2 sm:pt-6">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Zasiłkowy Przewodnik Przyszłego Rodzica</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Sprawdź swoje uprawnienia i wylicz zasiłek chorobowy w ciąży oraz zasiłek macierzyński – dla obojga rodziców, krok po kroku.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/logowanie">Zaloguj się przez mObywatel (symulacja)</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/start">Wprowadź dane ręcznie</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/sprawy">Przykładowe sprawy</Link>
          </Button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-card ring-foreground/10 space-y-2 rounded-xl p-5 ring-1">
            <f.icon className="text-primary size-6" aria-hidden />
            <h2 className="font-semibold">{f.title}</h2>
            <p className="text-muted-foreground text-sm">{f.text}</p>
          </div>
        ))}
      </section>
    </PageContainer>
  );
}
