import { birthDate, checkPeriods, eventDate, minusDays, or, periodsOf, pl, spanOf, str } from "./helpers";
import type { FieldDef, FormDef, FormValues } from "./types";

// ZAM – "Wniosek o zasiłek macierzyński". Fields mirror the ZUS form valid from 24.10.2026 (it replaced ZAM, ZUR
// and ZAO): https://www.zus.pl/wzory-formularzy/zasilki/zasilek-macierzynski (PDF „ZAM_pobierz i drukuj”,
// checked 2026-11-21). This is our own simulated rendering, not the ZUS print.

export const ZAM_SOURCE =
  "Formularz ZUS ZAM (wersja od 24.10.2026), zus.pl → Wzory formularzy → Zasiłki → Zasiłek macierzyński; art. 61 i 63 ustawy zasiłkowej";

const yesNo = [
  { value: "tak", label: "Tak" },
  { value: "nie", label: "Nie" },
];
const on = (k: string) => (v: FormValues) => v[k] === true;
const is = (k: string, ...vals: string[]) => (v: FormValues) => vals.includes(String(v[k]));
const period = (prefix: string, label: string, show: (v: FormValues) => boolean): FieldDef[] => [
  { name: `${prefix}From`, label: `${label} – od`, type: "date", required: true, showIf: show },
  { name: `${prefix}To`, label: `${label} – do`, type: "date", required: true, showIf: show },
];

const REASONS = [
  { value: "urodzenie", label: "1. Urodzenie dziecka/dzieci" },
  { value: "adopcja", label: "1. Przyjęcie dziecka na wychowanie i wystąpienie do sądu o przysposobienie" },
  { value: "piecza", label: "1. Przyjęcie dziecka w ramach rodziny zastępczej (z wyjątkiem zawodowej)" },
  { value: "przed_porodem", label: "2. Przewidywana data porodu (zasiłek przed porodem)" },
  { value: "po_ustaniu", label: "3. Urodzenie dziecka po ustaniu zatrudnienia (upadłość, likwidacja, …)" },
  { value: "uzupelniajacy", label: "4. Urodzenie dziecka i jego pobyt w szpitalu (uzupełniający urlop)" },
  { value: "sytuacja_matki", label: "5. Sytuacja matki dziecka (przejęcie zasiłku przez ojca)" },
];
const hasChildData = is("reason", "urodzenie", "adopcja", "piecza", "po_ustaniu", "uzupelniajacy", "sytuacja_matki");
const parentalOrSupp = (v: FormValues) => v.scopeParental === true || v.scopeSupplementary === true;

export const zam: FormDef = {
  id: "zam",
  title: "ZAM – Wniosek o zasiłek macierzyński",
  short: "ZAM – zasiłek macierzyński",
  description:
    "Jeden wniosek o zasiłek za urlop macierzyński, na warunkach macierzyńskiego, rodzicielski, uzupełniający i ojcowski. Składasz go u płatnika zasiłku: pracodawcy (powyżej 20 ubezpieczonych) albo w ZUS.",
  applicant: "rodzic",
  recipient: "płatnik zasiłku",
  source: ZAM_SOURCE,
  steps: [
    {
      title: "Twoje dane",
      fields: [
        { name: "pesel", label: "PESEL", type: "pesel", required: true },
        { name: "firstName", label: "Imię", type: "text", required: true },
        { name: "lastName", label: "Nazwisko", type: "text", required: true },
        { name: "street", label: "Ulica", type: "text" },
        { name: "houseNo", label: "Numer domu", type: "text", required: true },
        { name: "flatNo", label: "Numer lokalu", type: "text" },
        { name: "postCode", label: "Kod pocztowy", type: "text", required: true, hint: "np. 00-950" },
        { name: "city", label: "Miejscowość", type: "text", required: true },
        { name: "phone", label: "Numer telefonu (dobrowolnie)", type: "text" },
      ],
    },
    {
      title: "Płatnik i rachunek",
      fields: [
        { name: "payerId", label: "NIP płatnika składek (albo REGON / PESEL, jeśli nie ma NIP)", type: "text", required: true },
        { name: "payerName", label: "Nazwa albo imię i nazwisko płatnika składek", type: "text", required: true },
        {
          name: "account",
          label: "Numer rachunku bankowego (dobrowolnie)",
          type: "iban",
          sensitive: true,
          hint: "Nie zapisujemy go w przeglądarce. Bez numeru zasiłek zostanie wypłacony przekazem pocztowym.",
        },
      ],
    },
    {
      title: "Zakres wniosku",
      fields: [
        { name: "scopeMaternity", label: "Zasiłek za okres urlopu macierzyńskiego", type: "checkbox" },
        { name: "scopeAdoption", label: "Zasiłek za okres urlopu na warunkach urlopu macierzyńskiego", type: "checkbox" },
        ...period("adoption", "Urlop na warunkach macierzyńskiego", on("scopeAdoption")),
        { name: "scopeParental", label: "Zasiłek za okres urlopu rodzicielskiego", type: "checkbox" },
        ...period("parental", "Urlop rodzicielski", on("scopeParental")),
        { name: "parentalPart", label: "Która to część urlopu rodzicielskiego", type: "text", required: true, showIf: on("scopeParental") },
        { name: "scopeSupplementary", label: "Zasiłek za okres uzupełniającego urlopu macierzyńskiego", type: "checkbox" },
        ...period("supplementary", "Uzupełniający urlop macierzyński", on("scopeSupplementary")),
        { name: "scopePaternity", label: "Zasiłek za okres urlopu ojcowskiego", type: "checkbox" },
        ...period("paternity", "Urlop ojcowski", on("scopePaternity")),
        { name: "paternityPart", label: "Która to część urlopu ojcowskiego", type: "text", required: true, showIf: on("scopePaternity") },
        {
          name: "maternityEnd",
          label: "Data zakończenia pobierania zasiłku za okres urlopu macierzyńskiego / na warunkach macierzyńskiego",
          type: "date",
          showIf: (v) => v.scopeMaternity === true || v.scopeAdoption === true,
        },
        {
          name: "fullLeave",
          label:
            "Informuję, że zamierzam skorzystać z pełnego wymiaru urlopu macierzyńskiego / na warunkach macierzyńskiego i urlopu rodzicielskiego, a co najmniej jeden dzień urlopu rodzicielskiego przypadnie w pierwszym roku życia dziecka (zasiłek 81,5%)",
          type: "checkbox",
        },
      ],
    },
    {
      title: "Ubezpieczenie i powód",
      fields: [
        {
          name: "voluntary",
          label: "Prowadzisz działalność (lub współpracujesz, jesteś duchownym, marynarzem) – czy masz ubezpieczenie chorobowe?",
          type: "select",
          options: [...yesNo, { value: "nie_dotyczy", label: "Nie dotyczy (jestem pracownikiem / zleceniobiorcą)" }],
          required: true,
        },
        { name: "reason", label: "Wnioskuję o zasiłek macierzyński w związku z", type: "select", required: true, options: REASONS },
        { name: "acceptDate", label: "Data przyjęcia dziecka na wychowanie", type: "date", required: true, showIf: is("reason", "adopcja", "piecza") },
        { name: "dueDate", label: "Przewidywana data porodu", type: "date", required: true, showIf: is("reason", "przed_porodem") },
        {
          name: "terminationReason",
          label: "Mój pracodawca",
          type: "select",
          required: true,
          showIf: is("reason", "po_ustaniu"),
          options: [
            { value: "upadlosc", label: "ogłosił upadłość" },
            { value: "likwidacja", label: "ogłosił likwidację" },
            { value: "naruszenie", label: "rozwiązał umowę z naruszeniem prawa (prawomocny wyrok)" },
            { value: "zgon", label: "zmarł" },
          ],
        },
        {
          name: "prematurity",
          label: "Okoliczność (uzupełniający urlop)",
          type: "select",
          required: true,
          showIf: is("reason", "uzupelniajacy"),
          options: [
            { value: "przed28", label: "urodzenie przed ukończeniem 28. tygodnia ciąży" },
            { value: "do1000g", label: "masa urodzeniowa nie większa niż 1000 g" },
            { value: "28-37", label: "urodzenie między 28. a 37. tygodniem ciąży, masa > 1000 g" },
            { value: "po37", label: "urodzenie po 37. tygodniu i pobyt w szpitalu min. 2 kolejne dni (od 5. do 28. dnia po porodzie)" },
          ],
        },
        ...period("hospital", "Pobyt dziecka w szpitalu", is("reason", "uzupelniajacy")),
        {
          name: "motherSituation",
          label: "Sytuacja matki",
          type: "select",
          required: true,
          showIf: is("reason", "sytuacja_matki"),
          options: [
            { value: "skrocenie", label: "skrócenie zasiłku po wykorzystaniu co najmniej 14 tygodni po porodzie" },
            { value: "szpital", label: "przerwanie zasiłku z powodu pobytu w szpitalu (po co najmniej 8 tygodniach)" },
            { value: "niezdolnosc", label: "orzeczenie o niezdolności do samodzielnej egzystencji (po co najmniej 8 tygodniach)" },
            { value: "praca", label: "podjęcie pracy przez matkę (co najmniej 1/2 etatu)" },
            { value: "porzucenie", label: "porzucenie dziecka przez matkę" },
            { value: "smierc", label: "śmierć matki" },
          ],
        },
        { name: "motherDate", label: "Data zdarzenia", type: "date", required: true, showIf: is("reason", "sytuacja_matki") },
        { name: "motherData", label: "Dane matki: imię, nazwisko, PESEL", type: "text", required: true, showIf: is("reason", "sytuacja_matki") },
        { name: "childData", label: "Dane dziecka/dzieci: imię i nazwisko, data i miejsce urodzenia", type: "textarea", required: true, showIf: hasChildData },
        { name: "zaZyciem", label: "Dziecko ma zaświadczenie „Za życiem” (art. 4 ust. 3 ustawy „Za życiem”)", type: "checkbox", showIf: hasChildData },
      ],
    },
    {
      title: "Oświadczenia",
      fields: [
        {
          name: "paternityOther",
          label: "Pobierałem z innego tytułu zasiłek macierzyński za okres urlopu ojcowskiego",
          type: "select",
          required: true,
          options: yesNo,
          showIf: on("scopePaternity"),
        },
        { name: "paternityOtherInfo", label: "Tytuł i okres pobierania", type: "text", required: true, showIf: (v) => v.scopePaternity === true && v.paternityOther === "tak" },
        {
          name: "otherParentUses",
          label: "Drugi rodzic będzie korzystał z zasiłku za okres urlopu rodzicielskiego / uzupełniającego",
          type: "select",
          required: true,
          options: yesNo,
          showIf: parentalOrSupp,
        },
        ...period("otherParent", "Okres zasiłku drugiego rodzica", (v) => parentalOrSupp(v) && v.otherParentUses === "tak"),
        { name: "otherPesel", label: "Drugi rodzic – PESEL", type: "pesel", showIf: parentalOrSupp },
        { name: "otherFirstName", label: "Drugi rodzic – imię", type: "text", showIf: parentalOrSupp },
        { name: "otherLastName", label: "Drugi rodzic – nazwisko", type: "text", showIf: parentalOrSupp },
        {
          name: "sendTo",
          label: "Komu składasz wniosek (płatnik zasiłku)",
          type: "select",
          required: true,
          options: [
            { value: "pracodawca", label: "Pracodawcy (płatnik zgłasza ponad 20 ubezpieczonych)" },
            { value: "ZUS", label: "Do ZUS (działalność, zlecenie, płatnik do 20 ubezpieczonych)" },
          ],
        },
        { name: "date", label: "Data", type: "date", required: true },
        { name: "truth", label: "Oświadczam, że dane zawarte we wniosku podałem/podałam zgodnie z prawdą", type: "checkbox", required: true },
      ],
    },
  ],
  prefill: (ctx, role) => {
    const parent = ctx.parents.find((p) => p.role === role);
    const active = parent?.periods.find((p) => !p.to) ?? parent?.periods[0];
    const selfEmployed = active?.title === "dzialalnosc";
    const name = role === "matka" && ctx.person?.name && !/ i /.test(ctx.person.name) ? ctx.person.name.split(" ") : [];
    const pesel = role === "matka" ? (ctx.person?.pesel ?? "") : "";
    const s = ctx.scenario;
    const mat = spanOf(ctx, "macierzynski", role);
    const adoption = spanOf(ctx, "na_warunkach_macierzynskiego", role);
    const parental = periodsOf(ctx, "rodzicielski", role);
    const supp = periodsOf(ctx, "uzupelniajacy", role)[0];
    const pat = periodsOf(ctx, "ojcowski", role)[0];
    const otherRole = role === "matka" ? "ojciec" : "matka";
    const otherParental = spanOf(ctx, "rodzicielski", otherRole);
    const longApp = !!ctx.plan?.longApplication && role === "matka";
    const reason =
      s.kind === "adopcja" || s.kind === "piecza"
        ? s.kind
        : s.kind === "ciaza"
          ? active?.terminationReason && active.terminationReason !== "inne"
            ? "po_ustaniu"
            : "przed_porodem"
          : role === "ojciec" && mat
            ? "sytuacja_matki"
            : "urodzenie";
    const insuredCount = active?.payerInsuredCount ?? 0;
    return {
      pesel,
      firstName: name[0] ?? "",
      lastName: name.slice(1).join(" "),
      street: "",
      houseNo: "",
      flatNo: "",
      postCode: "",
      city: "",
      phone: "",
      payerId: selfEmployed ? pesel : "",
      payerName: selfEmployed ? [name.join(" "), "(własna działalność)"].join(" ").trim() : (active?.payerName ?? ""),
      account: "",
      scopeMaternity: !!mat,
      scopeAdoption: !!adoption,
      adoptionFrom: adoption?.from ?? "",
      adoptionTo: adoption?.to ?? "",
      scopeParental: parental.length > 0 && (longApp || role === "ojciec"),
      parentalFrom: parental[0]?.from ?? "",
      parentalTo: (longApp ? parental[parental.length - 1]?.to : parental[0]?.to) ?? "",
      parentalPart: longApp ? "cały urlop" : "1",
      scopeSupplementary: !!supp,
      supplementaryFrom: supp?.from ?? "",
      supplementaryTo: supp?.to ?? "",
      scopePaternity: !!pat,
      paternityFrom: pat?.from ?? "",
      paternityTo: pat?.to ?? "",
      paternityPart: "całość",
      maternityEnd: mat?.to ?? adoption?.to ?? "",
      fullLeave: longApp,
      voluntary: selfEmployed ? (active?.sickness === "dobrowolne" ? "tak" : "nie") : "nie_dotyczy",
      reason,
      acceptDate: s.kind === "adopcja" || s.kind === "piecza" ? s.acceptDate : "",
      dueDate: s.kind === "ciaza" ? s.dueDate : "",
      terminationReason:
        active?.terminationReason === "upadlosc" || active?.terminationReason === "likwidacja"
          ? active.terminationReason
          : active?.terminationReason === "smierc_pracodawcy"
            ? "zgon"
            : active?.terminationReason === "naruszenie_prawa_wyrok"
              ? "naruszenie"
              : "",
      prematurity: "",
      hospitalFrom: "",
      hospitalTo: "",
      motherSituation: reason === "sytuacja_matki" ? "skrocenie" : "",
      motherDate: mat?.from ?? "",
      motherData: "",
      childData: birthDate(ctx) && s.kind === "urodzenie" ? `…, ur. ${pl(birthDate(ctx))}` : "",
      zaZyciem: s.kind === "urodzenie" && s.zaZyciem,
      paternityOther: "nie",
      paternityOtherInfo: "",
      otherParentUses: otherParental ? "tak" : "nie",
      otherParentFrom: otherParental?.from ?? "",
      otherParentTo: otherParental?.to ?? "",
      otherPesel: "",
      otherFirstName: "",
      otherLastName: "",
      sendTo: !selfEmployed && active?.title === "umowa_o_prace" && insuredCount > 20 ? "pracodawca" : "ZUS",
      date: ctx.today,
      truth: false,
    };
  },
  recipientFor: (v) => (v.sendTo === "pracodawca" ? "pracodawca" : "ZUS"),
  check: (v) => {
    const e = checkPeriods(v, "adoption", "parental", "supplementary", "paternity", "hospital", "otherParent");
    if (![v.scopeMaternity, v.scopeAdoption, v.scopeParental, v.scopeSupplementary, v.scopePaternity].some((x) => x === true))
      e.scopeMaternity = "Zaznacz, za jaki okres wnioskujesz o zasiłek";
    if (str(v, "postCode") && !/^\d{2}-\d{3}$/.test(str(v, "postCode"))) e.postCode = "Kod pocztowy w formacie 00-000";
    return e;
  },
  attachments: (v) => {
    const a: string[] = [];
    if (v.sendTo === "ZUS" && v.voluntary === "nie_dotyczy") a.push("Zaświadczenie płatnika składek Z-3 (pracownik) albo Z-3a (inny tytuł ubezpieczenia) – wystawia płatnik");
    if (v.reason === "przed_porodem") a.push("Zaświadczenie lekarskie o przewidywanej dacie porodu");
    if (v.reason === "adopcja") a.push("Zaświadczenie sądu o wszczęciu postępowania o przysposobienie (z datą wystąpienia) i oświadczenie o dacie przyjęcia dziecka");
    if (v.reason === "piecza") a.push("Kopia orzeczenia sądu o umieszczeniu dziecka w rodzinie zastępczej (albo umowy ze starostą)");
    if (v.reason === "uzupelniajacy") a.push("Zaświadczenie ze szpitala o pobycie dziecka (i o tygodniu ciąży / masie urodzeniowej)");
    if (v.reason === "sytuacja_matki") a.push("Dokument potwierdzający sytuację matki (np. oświadczenie o rezygnacji, zaświadczenie ze szpitala, akt zgonu)");
    if (v.zaZyciem === true) a.push("Kopia zaświadczenia „Za życiem” (art. 4 ust. 3 ustawy)");
    if (v.sendTo === "pracodawca" && (v.reason === "urodzenie" || v.scopePaternity === true))
      a.push("Odpis skrócony aktu urodzenia dziecka (pracodawca może go wymagać; gdy wypłaca ZUS – nie trzeba, ZUS pobiera dane z rejestru)");
    return a;
  },
  render: (v) => {
    const scope: string[] = [];
    if (v.scopeMaternity === true) scope.push("urlopu macierzyńskiego");
    if (v.scopeAdoption === true) scope.push(`urlopu na warunkach urlopu macierzyńskiego (${pl(v.adoptionFrom)} – ${pl(v.adoptionTo)})`);
    if (v.scopeParental === true) scope.push(`urlopu rodzicielskiego, część: ${or(str(v, "parentalPart"))} (${pl(v.parentalFrom)} – ${pl(v.parentalTo)})`);
    if (v.scopeSupplementary === true) scope.push(`uzupełniającego urlopu macierzyńskiego (${pl(v.supplementaryFrom)} – ${pl(v.supplementaryTo)})`);
    if (v.scopePaternity === true) scope.push(`urlopu ojcowskiego, część: ${or(str(v, "paternityPart"))} (${pl(v.paternityFrom)} – ${pl(v.paternityTo)})`);
    const reason = REASONS.find((r) => r.value === v.reason)?.label.replace(/^\d\.\s*/, "") ?? "—";
    const address = [str(v, "street"), [str(v, "houseNo"), str(v, "flatNo")].filter(Boolean).join("/"), `${str(v, "postCode")} ${str(v, "city")}`.trim()]
      .filter(Boolean)
      .join(", ");
    const rows = [
      { label: "PESEL", value: or(str(v, "pesel"), "—") },
      { label: "Imię i nazwisko", value: `${str(v, "firstName")} ${str(v, "lastName")}`.trim() || "—" },
      { label: "Adres", value: address || "—" },
      ...(str(v, "phone") ? [{ label: "Telefon", value: str(v, "phone") }] : []),
      { label: "Płatnik składek", value: `${or(str(v, "payerName"), "—")} (NIP/REGON/PESEL: ${or(str(v, "payerId"), "—")})` },
      { label: "Rachunek bankowy", value: str(v, "account") ? `•••• ${str(v, "account").replace(/\s/g, "").slice(-4)}` : "nie podano – przekaz pocztowy" },
      { label: "Zasiłek za okres", value: scope.join("; ") || "—" },
      ...(str(v, "maternityEnd") ? [{ label: "Koniec zasiłku za okres macierzyńskiego", value: pl(v.maternityEnd) }] : []),
      { label: "Pełny wymiar urlopów (81,5%)", value: v.fullLeave === true ? "TAK" : "NIE" },
      { label: "Ubezpieczenie chorobowe (działalność)", value: v.voluntary === "nie_dotyczy" ? "nie dotyczy" : String(v.voluntary).toUpperCase() },
      { label: "Powód", value: reason },
      ...(str(v, "acceptDate") && (v.reason === "adopcja" || v.reason === "piecza") ? [{ label: "Data przyjęcia dziecka", value: pl(v.acceptDate) }] : []),
      ...(v.reason === "przed_porodem" ? [{ label: "Przewidywana data porodu", value: pl(v.dueDate) }] : []),
      ...(v.reason === "uzupelniajacy" ? [{ label: "Pobyt dziecka w szpitalu", value: `${pl(v.hospitalFrom)} – ${pl(v.hospitalTo)}` }] : []),
      ...(v.reason === "sytuacja_matki" ? [{ label: "Matka dziecka", value: `${or(str(v, "motherData"))}, zdarzenie: ${pl(v.motherDate)}` }] : []),
      ...(str(v, "childData") && hasChildData(v) ? [{ label: "Dziecko/dzieci", value: str(v, "childData") + (v.zaZyciem === true ? " (zaświadczenie „Za życiem”)" : "") }] : []),
      ...(v.scopePaternity === true ? [{ label: "Zasiłek za okres ojcowskiego z innego tytułu", value: v.paternityOther === "tak" ? `TAK – ${str(v, "paternityOtherInfo")}` : "NIE" }] : []),
      ...(parentalOrSupp(v)
        ? [
            {
              label: "Drugi rodzic korzysta z zasiłku",
              value: v.otherParentUses === "tak" ? `TAK, ${pl(v.otherParentFrom)} – ${pl(v.otherParentTo)}` : "NIE",
            },
            { label: "Drugi rodzic", value: `${str(v, "otherFirstName")} ${str(v, "otherLastName")}`.trim() + (str(v, "otherPesel") ? `, PESEL ${str(v, "otherPesel")}` : "") || "—" },
          ]
        : []),
    ];
    return {
      title: "Wniosek o zasiłek macierzyński (ZAM)",
      addressee: v.sendTo === "pracodawca" ? or(str(v, "payerName")) : "Zakład Ubezpieczeń Społecznych",
      paragraphs: [`Data: ${pl(v.date)}`, "Oświadczam, że dane zawarte we wniosku podałem/podałam zgodnie z prawdą. Jeżeli ulegną one zmianie, zobowiązuję się poinformować o tym płatnika zasiłku."],
      rows,
    };
  },
  deadline: (v, ctx) => {
    if (v.fullLeave === true && ctx.scenario.kind === "urodzenie") {
      return {
        date: minusDays(eventDate(ctx), -ctx.deadlines.longApplicationDaysAfterBirth),
        rule: `Wniosek o zasiłek w wysokości 81,5% za cały okres trzeba złożyć najpóźniej ${ctx.deadlines.longApplicationDaysAfterBirth} dni po porodzie.`,
        source: "art. 31 ust. 3 ustawy zasiłkowej",
      };
    }
    return undefined;
  },
};
