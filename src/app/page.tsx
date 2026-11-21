import { ArrowRight, Baby, FolderOpen, HeartHandshake, PencilLine, ShieldCheck, Smartphone, Users } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { SimulationBadge } from "@/components/simulation-badge";

const PATHS = [
  {
    href: "/logowanie",
    icon: Smartphone,
    title: "Zaloguj się przez mObywatel",
    text: "Pobierzemy Twoje dane z ZUS: ubezpieczenie, zarobki, płatnika i zwolnienia.",
    badge: true,
  },
  { href: "/kreator", icon: PencilLine, title: "Wprowadź dane samodzielnie", text: "Kilka pytań o Twoją sytuację, pracę i zarobki – także szacunkowo." },
  { href: "/sprawy", icon: FolderOpen, title: "Wybierz przykładową sprawę", text: "Gotowe przykłady z wyliczeniami albo wgranie własnej sprawy (.json)." },
];

const CHECKS = [
  { icon: Baby, label: "Świadczenia w ciąży – także gdy ich brak" },
  { icon: ShieldCheck, label: "Zasiłek macierzyński i jego wysokość" },
  { icon: Users, label: "Podział urlopów między rodziców" },
  { icon: HeartHandshake, label: "Adopcja i rodzina zastępcza" },
  { icon: FolderOpen, label: "Dokumenty, terminy i kto wypłaca" },
];

export default function Home() {
  return (
    <PageContainer className="space-y-10">
      <section className="space-y-4 pt-2 sm:pt-6">
        <p className="text-primary text-sm font-semibold">Zasiłkowy Przewodnik Przyszłego Rodzica</p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Sprawdź, jaki zasiłek Ci przysługuje w ciąży i po narodzinach dziecka</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">Indywidualnie – na podstawie Twoich danych. Dla obojga rodziców, z kalendarzem urlopów i listą dokumentów.</p>
      </section>

      <section aria-label="Jak zacząć" className="grid gap-4 md:grid-cols-3">
        {PATHS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group bg-card ring-foreground/10 hover:ring-primary focus-visible:ring-primary flex flex-col gap-3 rounded-2xl p-6 ring-1 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl">
                <p.icon className="size-5" aria-hidden />
              </span>
              {p.badge && <SimulationBadge />}
            </div>
            <h2 className="text-lg font-semibold">{p.title}</h2>
            <p className="text-muted-foreground flex-1 text-sm">{p.text}</p>
            <span className="text-primary inline-flex items-center gap-1 text-sm font-medium">
              Zaczynam <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Co sprawdzisz</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {CHECKS.map((c) => (
            <li key={c.label} className="bg-muted/60 flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
              <c.icon className="text-primary size-4 shrink-0" aria-hidden />
              {c.label}
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
