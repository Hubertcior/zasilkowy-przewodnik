import { birthDate, or, pl, str } from "./helpers";
import type { FormDef } from "./types";

// Simulated request for a copy of the birth certificate (rejestr stanu cywilnego). The real service is on gov.pl.

export const BIRTH_CERT_GOV_URL = "https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego";

export const birthCertificate: FormDef = {
  id: "odpis-aktu",
  title: "Wniosek o odpis aktu urodzenia (symulacja)",
  short: "Odpis aktu urodzenia",
  description:
    "Odpis skrócony jest potrzebny m.in. do wniosków o urlopy u pracodawcy. Prawdziwy wniosek złożysz online na gov.pl albo w dowolnym urzędzie stanu cywilnego.",
  applicant: "rodzic",
  recipient: "USC",
  source: "art. 44–45 ustawy – Prawo o aktach stanu cywilnego; usługa: gov.pl → Rejestr stanu cywilnego",
  steps: [
    {
      title: "Wnioskodawca",
      fields: [
        { name: "name", label: "Imię i nazwisko wnioskodawcy", type: "text", required: true },
        { name: "pesel", label: "PESEL wnioskodawcy", type: "pesel", required: true },
        {
          name: "relation",
          label: "Kim jesteś dla dziecka",
          type: "select",
          required: true,
          options: [
            { value: "matka", label: "Matką" },
            { value: "ojciec", label: "Ojcem" },
          ],
        },
      ],
    },
    {
      title: "Dziecko i odpis",
      fields: [
        { name: "childName", label: "Imię i nazwisko dziecka", type: "text", required: true },
        { name: "childBirthDate", label: "Data urodzenia dziecka", type: "date", required: true },
        { name: "birthPlace", label: "Miejsce urodzenia", type: "text", required: true },
        {
          name: "kind",
          label: "Rodzaj odpisu",
          type: "select",
          required: true,
          options: [
            { value: "skrocony", label: "Odpis skrócony" },
            { value: "zupelny", label: "Odpis zupełny" },
            { value: "wielojezyczny", label: "Odpis wielojęzyczny" },
          ],
        },
        {
          name: "purpose",
          label: "Cel",
          type: "select",
          required: true,
          options: [
            { value: "pracodawca", label: "Wniosek o urlop u pracodawcy" },
            { value: "zus", label: "Sprawa w ZUS" },
            { value: "inne", label: "Inna sprawa" },
          ],
        },
        {
          name: "delivery",
          label: "Sposób odbioru",
          type: "select",
          required: true,
          options: [
            { value: "elektronicznie", label: "Elektronicznie (skrzynka na gov.pl)" },
            { value: "usc", label: "Osobiście w USC" },
            { value: "poczta", label: "Pocztą" },
          ],
        },
        { name: "date", label: "Data wniosku", type: "date", required: true },
      ],
    },
  ],
  prefill: (ctx, role) => ({
    name: role === "matka" && ctx.person?.name && !/ i /.test(ctx.person.name) ? ctx.person.name : "",
    pesel: role === "matka" ? (ctx.person?.pesel ?? "") : "",
    relation: role,
    childName: "",
    childBirthDate: ctx.scenario.kind === "urodzenie" ? birthDate(ctx) : "",
    birthPlace: "",
    kind: "skrocony",
    purpose: "pracodawca",
    delivery: "elektronicznie",
    date: ctx.today,
  }),
  attachments: () => [],
  render: (v) => ({
    title: "Wniosek o wydanie odpisu aktu urodzenia",
    addressee: "Kierownik Urzędu Stanu Cywilnego",
    paragraphs: [
      `${or(str(v, "name"))} (PESEL ${or(str(v, "pesel"))}), ${v.relation === "ojciec" ? "ojciec" : "matka"} dziecka, wnosi o wydanie ${
        v.kind === "zupelny" ? "odpisu zupełnego" : v.kind === "wielojezyczny" ? "odpisu wielojęzycznego" : "odpisu skróconego"
      } aktu urodzenia dziecka ${or(str(v, "childName"))}, urodzonego ${pl(v.childBirthDate)} w miejscowości ${or(str(v, "birthPlace"))}.`,
      `Cel: ${v.purpose === "pracodawca" ? "wniosek o urlop u pracodawcy" : v.purpose === "zus" ? "sprawa w ZUS" : "inna sprawa"}. Odbiór: ${
        v.delivery === "elektronicznie" ? "elektronicznie" : v.delivery === "usc" ? "osobiście w USC" : "pocztą"
      }.`,
      `Data: ${pl(v.date)}`,
    ],
  }),
};
