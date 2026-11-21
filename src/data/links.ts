// Useful official links (KAN-31). All checked with HTTP 200 on 2026-11-21.

export interface UsefulLink {
  label: string;
  url: string;
  description: string;
}

export interface LinkGroup {
  title: string;
  links: UsefulLink[];
}

export const LINKS_CHECKED_AT = "2026-11-21";

export const ZUS_PARENTS_GUIDE = "https://www.zus.pl/documents/10182/167567/1184_26+Poradnik+dla+rodzic%C3%B3w.pdf";
export const PREGNANCY_LOSS_GOV = "https://www.gov.pl/web/rodzina/latwiejszy-dostep-do-swiadczen-po-stracie-ciazy";
export const PIP_PARENTHOOD = "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo";

export const LINK_GROUPS: LinkGroup[] = [
  {
    title: "ZUS",
    links: [
      { label: "Zasiłki – zus.pl", url: "https://www.zus.pl/swiadczenia/zasilki", description: "Opis wszystkich zasiłków z ubezpieczenia chorobowego." },
      { label: "Zasiłek macierzyński", url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski", description: "Kto ma prawo, ile wynosi, jak złożyć wniosek." },
      { label: "Zasiłek chorobowy", url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-chorobowy", description: "Także zasiłek w ciąży (100% podstawy)." },
      { label: "Zasiłek pogrzebowy", url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-pogrzebowy", description: "Także po martwym urodzeniu, bez względu na czas trwania ciąży." },
      { label: "Wzory formularzy", url: "https://www.zus.pl/wzory-formularzy", description: "Formularze ZUS do pobrania." },
      { label: "Formularz ZAM (zasiłek macierzyński)", url: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-macierzynski", description: "Aktualny wniosek ZAM (od 24.10.2026 zastąpił ZAM, ZUR i ZAO)." },
      { label: "Poradnik dla rodziców i opiekunów dzieci (PDF)", url: ZUS_PARENTS_GUIDE, description: "Poradnik ZUS 2026: zasiłki, ubezpieczenia, dokumenty." },
    ],
  },
  {
    title: "Ministerstwo Rodziny, Pracy i Polityki Społecznej",
    links: [
      { label: "Urlop rodzicielski – gov.pl", url: "https://www.gov.pl/web/rodzina/urlop-rodzicielski", description: "Zasady urlopu rodzicielskiego." },
      { label: "Świadczenia po stracie ciąży – gov.pl", url: PREGNANCY_LOSS_GOV, description: "Urlop i zasiłek po poronieniu lub martwym urodzeniu, dokumenty od 6.08.2025." },
      { label: "Program „Za życiem” – gov.pl", url: "https://www.gov.pl/web/zazyciem", description: "Wsparcie dla rodzin dzieci z ciężkimi chorobami." },
    ],
  },
  {
    title: "Państwowa Inspekcja Pracy",
    links: [{ label: "Rodzicielstwo – porady prawne PIP", url: PIP_PARENTHOOD, description: "Uprawnienia rodziców w pracy, ochrona przed zwolnieniem." }],
  },
  {
    title: "Rejestr stanu cywilnego",
    links: [
      { label: "Rejestr stanu cywilnego – gov.pl", url: "https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego", description: "Akty stanu cywilnego i odpisy." },
      { label: "Uzyskaj odpis aktu urodzenia – gov.pl", url: "https://www.gov.pl/web/gov/uzyskaj-odpis-aktu-urodzenia", description: "Wniosek o odpis online." },
    ],
  },
];
