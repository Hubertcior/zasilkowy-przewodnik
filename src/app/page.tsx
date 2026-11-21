import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Zasiłkowy Przewodnik Przyszłego Rodzica</h1>
      <p className="text-muted-foreground text-lg">
        Sprawdź swoje uprawnienia i wylicz zasiłek chorobowy w ciąży oraz zasiłek macierzyński – dla obojga rodziców, krok po kroku.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/logowanie">Zaloguj się przez mObywatel (symulacja)</Link>
        </Button>
      </div>
    </main>
  );
}
