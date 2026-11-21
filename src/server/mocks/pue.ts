// SYMULACJA „Zapytaj ZUS” (PUE/eZUS messages). Questions are kept in server memory per persona and answered
// with a keyword-based template after a short delay. No AI (KAN-37 may replace the templates later).

import { PUE_CATEGORY_LABEL, type PueCategory, type PueThread } from "@/lib/pue";

export { PUE_CATEGORIES, PUE_CATEGORY_LABEL, type PueCategory, type PueThread } from "@/lib/pue";

/** Simulated answer delay. */
export const PUE_ANSWER_DELAY_MS = 3000;

interface StoredThread extends Omit<PueThread, "answer" | "answeredAt" | "status"> {
  answer: string;
  answerAtMs: number;
}

interface Rule {
  keywords: string[];
  answer: string;
}

// Template answers. Content follows the ZUS parents' guide; each names the legal basis.
const RULES: Rule[] = [
  {
    keywords: ["zadłuż", "zaleg", "składk"],
    answer:
      "Zasiłek nie jest wypłacany, dopóki nie zostanie spłacone zadłużenie składkowe istniejące na dzień powstania prawa do zasiłku. " +
      "Przy dobrowolnym ubezpieczeniu chorobowym nieopłacenie składki w terminie może spowodować ustanie ubezpieczenia " +
      "(art. 14 ust. 2 pkt 2 ustawy o systemie ubezpieczeń społecznych). Stan rozliczeń sprawdzisz na PUE/eZUS.",
  },
  {
    keywords: ["81,5", "81.5", "100%", "70%", "ile ", "wysokość", "kwot"],
    answer:
      "Zasiłek macierzyński wynosi 100% podstawy za okres urlopu macierzyńskiego i 70% za rodzicielski albo 81,5% podstawy za cały okres, " +
      "jeśli we wniosku złożonym do 21 dni po porodzie poprosisz o cały urlop od razu (art. 31 ustawy zasiłkowej). " +
      "Dokładną kwotę dla Twojej sytuacji pokazuje kalkulator.",
  },
  {
    keywords: ["ciąż", "l4", "zwolnien", "e-zla", "kod b"],
    answer:
      "Za okres niezdolności do pracy w czasie ciąży (zaświadczenie e-ZLA z kodem B) zasiłek chorobowy wynosi 100% podstawy " +
      "(art. 11 ust. 2 pkt 2 ustawy zasiłkowej) i przysługuje do 270 dni (art. 8 ustawy zasiłkowej).",
  },
  {
    keywords: ["ojc", "tat", "partner"],
    answer:
      "Ojciec dziecka ma prawo do 9 tygodni urlopu rodzicielskiego, których nie można przenieść na matkę (art. 182¹ᵃ § 1 Kodeksu pracy), " +
      "oraz do 2 tygodni urlopu ojcowskiego do ukończenia przez dziecko 12 miesięcy (art. 182³ Kodeksu pracy).",
  },
  {
    keywords: ["wniosek", "zam", "z-3", "dokument", "akt urodzenia", "formularz"],
    answer:
      "Pracownik składa wniosek o urlop u pracodawcy, a pracodawca przekazuje dokumenty do ZUS. Osoby prowadzące działalność składają " +
      "wniosek ZAM wraz z odpisem aktu urodzenia (lub oświadczeniem) bezpośrednio w ZUS – najwygodniej przez PUE/eZUS. " +
      "Lista dokumentów: rozporządzenie w sprawie dokumentów do zasiłków (Dz.U. 2026 poz. 1316).",
  },
  {
    keywords: ["działalno", "jdg", "dobrowol"],
    answer:
      "Przy działalności gospodarczej prawo do zasiłków daje tylko dobrowolne ubezpieczenie chorobowe, a zasiłek przysługuje po 90 dniach " +
      "nieprzerwanego ubezpieczenia (art. 4 ust. 1 pkt 2 ustawy zasiłkowej). Wyjątek: zasiłek macierzyński nie wymaga okresu wyczekiwania.",
  },
];

const CATEGORY_DEFAULT: Record<PueCategory, string> = {
  macierzynski:
    "Zasiłek macierzyński przysługuje osobie objętej ubezpieczeniem chorobowym (obowiązkowo lub dobrowolnie) w dniu porodu, " +
    "przyjęcia dziecka lub przez okres urlopu (art. 29 ustawy zasiłkowej). Szczegóły w poradniku ZUS dla rodziców.",
  chorobowy:
    "Zasiłek chorobowy przysługuje za okres niezdolności do pracy potwierdzonej zaświadczeniem e-ZLA, po okresie wyczekiwania " +
    "(art. 4 i 6 ustawy zasiłkowej). W ciąży wynosi 100% podstawy.",
  dokumenty:
    "Wzory wniosków znajdziesz na zus.pl w sekcji „Wzory formularzy”. Wnioski możesz złożyć elektronicznie przez PUE/eZUS.",
};

/** Keyword-based template answer (pure, testable). */
export function answerFor(category: PueCategory, text: string): string {
  const t = text.toLowerCase();
  const hit = RULES.find((r) => r.keywords.some((k) => t.includes(k)));
  return (
    (hit?.answer ?? CATEGORY_DEFAULT[category]) +
    "\n\nTo jest odpowiedź symulowana (szablon), a nie stanowisko ZUS. W sprawach indywidualnych skontaktuj się z ZUS: zus.pl, tel. 22 560 16 00."
  );
}

// Keep the store on globalThis so it survives hot reload in dev. On serverless hosting it is per-instance only.
const g = globalThis as unknown as { __pueThreads?: Map<string, StoredThread[]> };
const store: Map<string, StoredThread[]> = (g.__pueThreads ??= new Map());

function view(t: StoredThread, nowMs: number): PueThread {
  const { answer, answerAtMs, ...rest } = t;
  return nowMs >= answerAtMs
    ? { ...rest, answer, answeredAt: new Date(answerAtMs).toISOString(), status: "odpowiedziano" }
    : { ...rest, status: "oczekuje" };
}

export function createThread(
  personaId: string,
  input: { category: PueCategory; subject?: string; question: string },
  nowMs: number = Date.now(),
): PueThread {
  const list = store.get(personaId) ?? [];
  const t: StoredThread = {
    id: `pue-${nowMs.toString(36)}-${list.length + 1}`,
    category: input.category,
    subject: input.subject?.trim() || PUE_CATEGORY_LABEL[input.category],
    question: input.question.trim(),
    createdAt: new Date(nowMs).toISOString(),
    answer: answerFor(input.category, `${input.subject ?? ""} ${input.question}`),
    answerAtMs: nowMs + PUE_ANSWER_DELAY_MS,
  };
  store.set(personaId, [t, ...list].slice(0, 50));
  return view(t, nowMs);
}

export function listThreads(personaId: string, nowMs: number = Date.now()): PueThread[] {
  return (store.get(personaId) ?? []).map((t) => view(t, nowMs));
}

export function clearThreads(personaId?: string) {
  if (personaId) store.delete(personaId);
  else store.clear();
}
