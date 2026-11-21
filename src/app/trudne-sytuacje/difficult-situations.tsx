"use client";

import {
  Calculator,
  ExternalLink,
  FileText,
  HeartHandshake,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Money } from "@/components/money";
import { SourceLink } from "@/components/source-link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  PIP_PARENTHOOD,
  PREGNANCY_LOSS_GOV,
  ZUS_PARENTS_GUIDE,
} from "@/data/links";
import {
  organizationsFor,
  ORGANIZATIONS_VERIFIED_AT,
  type SituationId,
} from "@/data/organizations";
import type { Params } from "@/engine/params";

// Calm, plain language; amounts and periods come from the current parameters (/api/params).

interface Situation {
  id: SituationId;
  title: string;
  intro: string;
  rights: (p: Params) => ReactNode[];
  documents: ReactNode[];
  actions: { label: string; href: string; icon: "calc" | "form" | "ext" }[];
  sources: string[];
}

const W = (n: number) =>
  `${n} ${n === 1 ? "tydzień" : n < 5 ? "tygodnie" : "tygodni"}`;
const pct = (r: number) => `${Math.round(r * 1000) / 10}%`.replace(".", ",");

const SITUATIONS: Situation[] = [
  {
    id: "strata",
    title: "Poronienie, martwe urodzenie lub śmierć dziecka",
    intro:
      "Bardzo nam przykro. Poniżej znajdziesz to, co przysługuje Ci z ubezpieczenia – żeby formalności zajęły jak najmniej czasu i sił. Kodeks pracy nie rozróżnia utraty ciąży, poronienia i martwego urodzenia: prawo do urlopu i zasiłku nie zależy od tygodnia ciąży.",
    rights: (p) => [
      <>
        Urlop macierzyński i zasiłek macierzyński przez{" "}
        <strong>{W(p.childDeath.maternityWeeksIfBefore8Weeks)}</strong> od
        porodu, gdy dziecko urodziło się martwe albo zmarło przed ukończeniem 8
        tygodni życia – nie krócej jednak niż{" "}
        <strong>{p.childDeath.minDaysAfterDeath} dni</strong> od dnia śmierci
        dziecka.
      </>,
      <>
        Jeśli dziecko zmarło po ukończeniu 8 tygodni życia, zasiłek przysługuje
        przez <strong>{p.childDeath.daysAfterDeathIfAfter8Weeks} dni</strong> od
        dnia śmierci.
      </>,
      <>
        Zasiłek wynosi <strong>{pct(p.rates.maternity)} podstawy</strong>. Tak
        samo przysługuje pracownicom i osobom ubezpieczonym z innego tytułu, np.
        prowadzącym działalność z dobrowolnym ubezpieczeniem chorobowym.
        Pracodawca nie może odmówić tego urlopu.
      </>,
      <>
        Zasiłek pogrzebowy{" "}
        <Money value={p.childDeath.funeralGrant} className="font-semibold" /> –
        także po martwym urodzeniu, bez względu na czas trwania ciąży. Otrzymuje
        go osoba, która pokryła koszty pogrzebu, w pełnej kwocie, nawet gdy
        koszty były niższe. Wniosek składa się w ZUS w ciągu 12 miesięcy od dnia
        pochówku.
      </>,
      "Przy porodzie mnogim, gdy zmarło jedno z dzieci, wymiar urlopu ustala się według liczby dzieci, które żyją.",
    ],
    documents: [
      "Od 6 sierpnia 2025 r. wystarczy zaświadczenie o martwym urodzeniu wydane na podstawie dokumentacji medycznej – bez badań genetycznych i ustalania płci. Wystawia je lekarz ze specjalizacją (lub w trakcie specjalizacji) z położnictwa i ginekologii albo położna.",
      "Jeśli sporządzono akt urodzenia – odpis skrócony z adnotacją o martwym urodzeniu. Kopie dokumentów może potwierdzić za zgodność z oryginałem ubezpieczona, pracodawca albo ZUS.",
      "Po śmierci dziecka – odpis skrócony aktu zgonu.",
      "Zasiłek pogrzebowy: wniosek Z-12, rachunki za pogrzeb oraz karta zgonu albo zaświadczenie o martwym urodzeniu (gdy nie ma aktu urodzenia).",
    ],
    actions: [
      {
        label: "Kalkulator: martwe urodzenie",
        href: "/kalkulator?sytuacja=martwe-urodzenie",
        icon: "calc",
      },
      {
        label: "Kalkulator: śmierć dziecka",
        href: "/kalkulator?sytuacja=zgon-dziecka",
        icon: "calc",
      },
      {
        label: "Świadczenia po stracie ciąży (gov.pl)",
        href: PREGNANCY_LOSS_GOV,
        icon: "ext",
      },
    ],
    sources: [
      "art. 180¹ Kodeksu pracy",
      `gov.pl – Łatwiejszy dostęp do świadczeń po stracie ciąży: ${PREGNANCY_LOSS_GOV}`,
      "Poradnik ZUS dla rodziców i opiekunów dzieci 2026, s. 33–35",
    ],
  },
  {
    id: "wczesniak",
    title: "Wcześniak lub dziecko w szpitalu po porodzie",
    intro:
      "Gdy dziecko urodzi się przedwcześnie albo musi zostać w szpitalu, rodzicom przysługuje uzupełniający urlop macierzyński. Wykorzystuje się go bezpośrednio po urlopie macierzyńskim, w całości – może go wziąć mama albo tata.",
    rights: (p) => {
      const s = p.supplementary;
      return [
        <>
          Dziecko urodzone przed {s.extreme.beforeGestationWeek}. tygodniem
          ciąży albo z masą do {s.extreme.maxBirthWeightG} g: tydzień urlopu za
          każdy tydzień pobytu w szpitalu, najwyżej{" "}
          <strong>{W(s.extreme.maxWeeks)}</strong>.
        </>,
        <>
          Dziecko urodzone między {s.preterm.fromGestationWeek}. a{" "}
          {s.preterm.beforeGestationWeek}. tygodniem ciąży, z masą powyżej{" "}
          {s.preterm.minBirthWeightGExclusive} g: najwyżej{" "}
          <strong>{W(s.preterm.maxWeeks)}</strong>.
        </>,
        <>
          Dziecko urodzone po {s.term.fromGestationWeek}. tygodniu ciąży, które
          przebywało w szpitalu co najmniej {s.term.minConsecutiveHospitalDays}{" "}
          kolejne dni (pierwszy z nich między {s.term.hospitalWindowFromDay}. a{" "}
          {s.term.hospitalWindowToDay}. dniem po porodzie): najwyżej{" "}
          <strong>{W(s.term.maxWeeks)}</strong>.
        </>,
        <>
          Zasiłek za ten okres wynosi{" "}
          <strong>{pct(p.rates.supplementary)} podstawy</strong>. Niepełny
          tydzień pobytu w szpitalu liczy się jako pełny.
        </>,
      ];
    },
    documents: [
      "Zaświadczenie ze szpitala o pobycie dziecka (z okresem pobytu, tygodniem ciąży i masą urodzeniową).",
      "Oświadczenie, że drugi rodzic nie zamierza korzystać z tego urlopu.",
      "Pracownik składa wniosek u pracodawcy najpóźniej 21 dni przed końcem urlopu macierzyńskiego; inne osoby – ZAM w ZUS.",
    ],
    actions: [
      {
        label: "Kalkulator: wcześniak",
        href: "/kalkulator?sytuacja=wczesniak",
        icon: "calc",
      },
      {
        label: "Wniosek o uzupełniający urlop",
        href: "/wnioski?formularz=uzupelniajacy",
        icon: "form",
      },
    ],
    sources: [
      "art. 180² Kodeksu pracy",
      "§ 14 rozporządzenia Dz.U. 2025 poz. 322",
      "Poradnik ZUS dla rodziców i opiekunów dzieci 2026, s. 30",
    ],
  },
  {
    id: "ciezko-chore",
    title: "Ciężko chore dziecko i zaświadczenie „Za życiem”",
    intro:
      "Jeśli dziecko ma zaświadczenie o ciężkim i nieodwracalnym upośledzeniu albo nieuleczalnej chorobie zagrażającej życiu (art. 4 ust. 3 ustawy „Za życiem”), urlop rodzicielski jest znacznie dłuższy.",
    rights: (p) => [
      <>
        Urlop rodzicielski: <strong>{W(p.parentalWeeks.zaZyciemSingle)}</strong>{" "}
        przy jednym dziecku i{" "}
        <strong>{W(p.parentalWeeks.zaZyciemMultiple)}</strong> przy porodzie
        mnogim (zamiast {p.parentalWeeks.single} i {p.parentalWeeks.multiple}).
      </>,
      <>
        Zasiłek za urlop rodzicielski wynosi {pct(p.rates.parental)} podstawy, a
        przy wniosku o cały urlop złożonym do 21 dni po porodzie –{" "}
        {pct(p.rates.longApplication)} za cały okres.
      </>,
    ],
    documents: [
      "Kopia zaświadczenia „Za życiem” – dołącza się ją do wniosku o urlop rodzicielski.",
      "We wniosku ZAM zaznacz oświadczenie, że dziecko ma takie zaświadczenie.",
    ],
    actions: [
      {
        label: "Kalkulator: „Za życiem”",
        href: "/kalkulator?sytuacja=za-zyciem",
        icon: "calc",
      },
      {
        label: "Program „Za życiem” (gov.pl)",
        href: "https://www.gov.pl/web/zazyciem",
        icon: "ext",
      },
    ],
    sources: [
      "art. 182¹ᵃ § 2 Kodeksu pracy",
      "§ 15 ust. 2 pkt 3 rozporządzenia Dz.U. 2025 poz. 322",
      "Poradnik ZUS dla rodziców i opiekunów dzieci 2026, s. 32",
    ],
  },
  {
    id: "matka",
    title: "Ciężka choroba, pobyt w szpitalu lub śmierć mamy",
    intro:
      "Gdy mama nie może opiekować się dzieckiem, urlop macierzyński może przejąć tata – w szczególnych sytuacjach także przed upływem 14 tygodni od porodu.",
    rights: (p) => [
      `Po wykorzystaniu co najmniej ${p.motherObligatoryWeeks} tygodni po porodzie mama może zrezygnować z reszty urlopu macierzyńskiego, a tata przejmuje pozostałą część.`,
      "Wcześniej – po co najmniej 8 tygodniach urlopu po porodzie – gdy mama przebywa w szpitalu i jej stan zdrowia nie pozwala na opiekę nad dzieckiem, gdy ma orzeczenie o niezdolności do samodzielnej egzystencji albo gdy porzuciła dziecko.",
      "Po śmierci mamy tata otrzymuje pozostałą część urlopu macierzyńskiego.",
      "Tak samo, gdy mama nie jest ubezpieczona – np. tata może skorzystać z urlopu po śmierci mamy albo gdy podjęła pracę na co najmniej pół etatu.",
    ],
    documents: [
      "Wniosek taty o część urlopu macierzyńskiego oraz odpis skrócony aktu urodzenia dziecka.",
      "Pobyt w szpitalu: oświadczenie mamy o dacie przerwania urlopu i zaświadczenie szpitala o przyjęciu.",
      "Niezdolność do samodzielnej egzystencji: kopia prawomocnego orzeczenia.",
      "Śmierć mamy: oświadczenie o dacie zgonu.",
    ],
    actions: [
      {
        label: "Kalkulator: mama w szpitalu",
        href: "/kalkulator?sytuacja=szpital-matki",
        icon: "calc",
      },
      {
        label: "Kalkulator: śmierć mamy",
        href: "/kalkulator?sytuacja=smierc-matki",
        icon: "calc",
      },
      {
        label: "Wniosek ZAM dla taty",
        href: "/wnioski?formularz=zam&rola=ojciec",
        icon: "form",
      },
    ],
    sources: [
      "art. 180 § 8, § 9 i § 16 Kodeksu pracy",
      "§ 3–13 rozporządzenia Dz.U. 2025 poz. 322",
    ],
  },
  {
    id: "praca",
    title: "Utrata pracy w ciąży",
    intro:
      "Kobieta w ciąży jest chroniona przed zwolnieniem. Jeśli umowa skończy się z przyczyn leżących po stronie pracodawcy, nadal możesz mieć prawo do świadczeń.",
    rights: () => [
      "Pracodawca nie może wypowiedzieć ani rozwiązać umowy o pracę w okresie ciąży i urlopu macierzyńskiego (z wyjątkami, np. upadłość lub likwidacja pracodawcy).",
      "Umowa na czas określony, która skończyłaby się po upływie 3. miesiąca ciąży, przedłuża się do dnia porodu.",
      "Gdy umowa ustała w ciąży z powodu upadłości lub likwidacji pracodawcy (także śmierci pracodawcy albo rozwiązania umowy z naruszeniem prawa stwierdzonego wyrokiem), do porodu przysługuje zasiłek w wysokości zasiłku macierzyńskiego, a po porodzie – zasiłek macierzyński.",
      "W razie wątpliwości co do zwolnienia skontaktuj się z Państwową Inspekcją Pracy.",
    ],
    documents: [
      "Świadectwo pracy lub dokument potwierdzający ustanie zatrudnienia i jego przyczynę.",
      "Wniosek ZAM złożony w ZUS (powód: urodzenie dziecka po ustaniu zatrudnienia).",
    ],
    actions: [
      {
        label: "Przykład w kalkulatorze: likwidacja pracodawcy",
        href: "/demo/magda?do=moja-sytuacja",
        icon: "calc",
      },
      { label: "PIP – rodzicielstwo", href: PIP_PARENTHOOD, icon: "ext" },
    ],
    sources: [
      "art. 177 § 1 i § 3 Kodeksu pracy",
      "art. 30 ustawy zasiłkowej",
      "formularz ZUS ZAM (powód 3)",
    ],
  },
];

function Action({ a }: { a: Situation["actions"][number] }) {
  const Icon =
    a.icon === "calc"
      ? Calculator
      : a.icon === "form"
        ? FileText
        : ExternalLink;
  if (a.icon === "ext") {
    return (
      <Button asChild variant="outline" size="sm">
        <a href={a.href} target="_blank" rel="noopener noreferrer">
          <Icon aria-hidden /> {a.label}
        </a>
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={a.href}>
        <Icon aria-hidden /> {a.label}
      </Link>
    </Button>
  );
}

/** /trudne-sytuacje – rights, documents, calculator links and charitable organisations for difficult situations (KAN-31). */
export function DifficultSituations() {
  const [params, setParams] = useState<Params | null>(null);
  const [open, setOpen] = useState<string>("");

  useEffect(() => {
    void fetch("/api/params")
      .then((r) => r.json() as Promise<Params>)
      .then(setParams);
    const hash = window.location.hash.replace("#", "");
    if (SITUATIONS.some((s) => s.id === hash))
      queueMicrotask(() => setOpen(hash));
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Trudne sytuacje
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          Informacje o świadczeniach w sytuacjach, które nikt nie chce
          przeżywać. Przy każdej znajdziesz potrzebne dokumenty, wyliczenie w
          kalkulatorze i organizacje charytatywne, które pomagają rodzicom.
        </p>
        <p className="text-muted-foreground max-w-3xl text-sm">
          Jeśli potrzebujesz pilnej pomocy psychologicznej, zadzwoń pod
          bezpłatny numer <strong className="text-foreground">116 123</strong>{" "}
          (telefon zaufania dla dorosłych w kryzysie emocjonalnym) albo{" "}
          <strong className="text-foreground">112</strong> w nagłym wypadku.
        </p>
      </header>

      {/* Rendered once params are loaded: Radix measures the panel height on open, later growth would be clipped. */}
      {!params ? (
        <div
          className="bg-muted h-80 animate-pulse rounded-xl"
          aria-label="Wczytuję"
        />
      ) : (
        <Accordion
          type="single"
          collapsible
          value={open}
          onValueChange={setOpen}
          className="rounded-xl border"
        >
          {SITUATIONS.map((s) => {
            const orgs = organizationsFor(s.id);
            return (
              <AccordionItem key={s.id} value={s.id} id={s.id} className="px-4">
                <AccordionTrigger className="text-base">
                  {s.title}
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-6">
                  <p className="leading-relaxed">{s.intro}</p>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <section className="space-y-2">
                      <h3 className="font-medium">Co przysługuje</h3>
                      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
                        {s.rights(params).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="space-y-2">
                      <h3 className="font-medium">Jakie dokumenty</h3>
                      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
                        {s.documents.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.actions.map((a) => (
                      <Action key={a.href} a={a} />
                    ))}
                  </div>
                  {orgs.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="flex items-center gap-2 font-medium">
                        <HeartHandshake className="size-4" aria-hidden />{" "}
                        Organizacje, które pomagają
                      </h3>
                      <ul className="grid gap-3 md:grid-cols-2">
                        {orgs.map((o) => (
                          <li
                            key={o.id}
                            className="bg-muted/40 rounded-lg border p-3 text-sm"
                          >
                            <a
                              href={o.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary inline-flex items-start gap-1 font-medium underline underline-offset-2"
                            >
                              {o.name}{" "}
                              <ExternalLink
                                className="mt-1 size-3 shrink-0"
                                aria-hidden
                              />
                            </a>
                            <p className="mt-1 leading-relaxed">
                              {o.description}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {o.area} · KRS {o.krs}
                              {o.opp
                                ? " · organizacja pożytku publicznego"
                                : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {s.id === "praca" && (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Phone className="size-4" aria-hidden /> Porady prawne
                      PIP:{" "}
                      <a
                        href={PIP_PARENTHOOD}
                        className="underline underline-offset-2"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        pip.gov.pl
                      </a>
                    </p>
                  )}
                  <div className="space-y-1">
                    {s.sources.map((src) => (
                      <div key={src}>
                        <SourceLink source={src} />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <footer className="text-muted-foreground space-y-1 text-xs">
        <p>
          Wymieniamy wyłącznie organizacje non-profit. Nazwy i numery KRS
          sprawdziliśmy na stronach organizacji ({ORGANIZATIONS_VERIFIED_AT}).
          Aplikacja nie jest z nimi powiązana.
        </p>
        <p>
          Więcej:{" "}
          <Link
            href="/przydatne-linki"
            className="underline underline-offset-2"
          >
            przydatne linki
          </Link>{" "}
          ·{" "}
          <a
            href={ZUS_PARENTS_GUIDE}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Poradnik ZUS dla rodziców (PDF)
          </a>
        </p>
      </footer>
    </div>
  );
}
