# Zasiłkowy Przewodnik Przyszłego Rodzica

**Jedno miejsce, w którym przyszły rodzic sprawdza swoje prawo do zasiłków, widzi ich wysokość na osi czasu i dostaje gotowe wnioski – z wyjaśnieniem każdego wyliczenia i podstawą prawną.**

HackNation 2026 · zadanie Zakładu Ubezpieczeń Społecznych · repozytorium: https://github.com/Hubertcior/zasilkowy-przewodnik

| | |
|---|---|
| Demo online | _uzupełnić po wdrożeniu na Vercel_ (instrukcja w [README](../README.md#deploy-vercel)) |
| Film (≤ 3 min) | _w przygotowaniu_ – po publikacji w aplikacji na `/o-projekcie`; skrypt: [film-skrypt.md](film-skrypt.md) |
| Prezentacja (≤ 10 slajdów) | [prezentacja.html](prezentacja.html), notatki i Q&A: [pitch-notatki.md](pitch-notatki.md) |
| Hasło panelu admina na demo | `demo-zus` (gdy nie ustawiono `ADMIN_PASSWORD`) |

![Moja sytuacja – desktop](screens/03-moja-sytuacja-desktop.jpg)

## 1. Problem

Przyszli rodzice często nie wiedzą, jakie mają uprawnienia z ubezpieczenia chorobowego, ani od czego zależą. Skutki znamy z praktyki ZUS:

- **brak wiedzy o uprawnieniach** – np. osoba prowadząca działalność nie wie, że bez dobrowolnego ubezpieczenia chorobowego nie dostanie zasiłku macierzyńskiego, a przy zaległości składkowej zasiłek zostanie wstrzymany;
- **zaskakujące decyzje** – inna kwota niż oczekiwana (podstawa z 12 miesięcy, 81,5% zamiast 100%, kto wypłaca: płatnik czy ZUS);
- **błędne lub spóźnione wnioski** – np. wniosek o cały urlop złożony po 21 dniach od porodu, brak wymaganych załączników;
- **spory i odwołania**, które wynikają z niezrozumienia przepisów, a nie z błędu urzędu.

## 2. Rozwiązanie

Aplikacja webowa (RWD), która:

1. **ustala uprawnienia indywidualnie** – z danych pobranych z ZUS (symulacja mObywatela), z danych wpisanych w kreatorze albo z przykładowej sprawy (wybór lub upload pliku JSON);
2. **liczy wszystkie świadczenia jednym zintegrowanym kalkulatorem** (rekomendacja ZUS): zasiłek chorobowy w ciąży, zasiłek w wysokości macierzyńskiego, zasiłek macierzyński dla obojga rodziców z wieloraczkami, „Za życiem”, wcześniakiem, adopcją, pieczą zastępczą i łączeniem urlopu z pracą;
3. **tłumaczy każdy wynik** – krok po kroku, jak powstała podstawa wymiaru, z odwołaniem do artykułu ustawy lub Kodeksu pracy;
4. **ostrzega przed utratą lub obniżeniem uprawnień** (12 reguł, np. termin 21 dni, przepadające 9 tygodni ojca, zadłużenie składkowe, pozorność umowy);
5. **prowadzi przez dokumenty** – co, gdzie i do kiedy złożyć (pracodawca czy ZUS), a potem wypełnia wnioski danymi z kalkulatora i symuluje ich wysyłkę;
6. **pomaga w trudnych sytuacjach** – poronienie, martwe urodzenie, wcześniak, ciężko chore dziecko, choroba mamy, utrata pracy – z listą zweryfikowanych organizacji charytatywnych;
7. **pozwala aktualizować przepisy bez programisty** – stawki, wymiary i terminy są parametrami edytowanymi w panelu administracyjnym, z historią zmian.

## 3. Pokrycie wymagań ZUS

Legenda: ✓ zrobione · ◐ częściowo (opis w uwagach).

### Funkcje (a–j)

| Id | Wymaganie | Gdzie w aplikacji | Status |
|----|-----------|-------------------|--------|
| a | Świadczenia w ciąży, także ich brak: zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości macierzyńskiego | `/moja-sytuacja` (sekcja „W ciąży”), `/konto?tab=ezla` (przeliczenie L4 z kodem B), `POST /api/pregnancy` | ✓ (świadczenie rehabilitacyjne – informacja, bez kalkulacji) |
| b | Kalkulator zasiłku macierzyńskiego dla obojga rodziców: liczba dzieci, wiek, „Za życiem” | `/kalkulator` | ✓ |
| c | Łączenie pracy z urlopem rodzicielskim | `/kalkulator` (część rodzicielskiego z pracą ¼ / ½ etatu), wniosek `/wnioski?formularz=rodzicielski` | ✓ |
| d | Symulacja korzystania przez oboje rodziców | `/kalkulator` (podział części, przejęcie macierzyńskiego, ojcowski, oś czasu Gantta, wypłaty miesiąc po miesiącu) | ✓ |
| e, j | Rodzice adopcyjni i rodzina zastępcza niezawodowa | `/kalkulator` (rodzaj: adopcja / piecza), persona `/demo/ewa-piotr`, wniosek „na warunkach macierzyńskiego” | ✓ |
| f | Indywidualna podstawa dla konkretnej sprawy z zestawów ZUS | `/sprawy` (wybór lub upload JSON), porównanie „Wynik ZUS a nasze wyliczenie”, `npm run cases` | ✓ |
| g | Dokumenty, terminy, sposób złożenia, kto wypłaca | `/co-i-gdzie`, `/wnioski` | ✓ |
| h | Zagrożenia: utrata uprawnień, zmiana wymiaru lub wysokości | `/moja-sytuacja`, `/kalkulator` (sekcje „Uważaj na”) | ✓ |
| i | Organizacje wyłącznie charytatywne na sytuacje szczególne | `/trudne-sytuacje` (8 fundacji, KRS sprawdzony na ich stronach) | ✓ |
| — | Jeden zintegrowany kalkulator z opcjami | `/kalkulator`; presety `?sytuacja=martwe-urodzenie\|wczesniak\|za-zyciem\|…` | ✓ |

### Symulacje

| Wymaganie | Gdzie | Status |
|-----------|-------|--------|
| Logowanie przez mObywatel | `/logowanie` (6 fikcyjnych person, zgoda, sesja w ciasteczku httpOnly) | ✓ |
| Dane z ZUS albo ręczne wprowadzenie | `/logowanie` → `GET /api/mock/zus/profile`; `/kreator` (5 kroków) | ✓ |
| Zadłużenie składkowe na dzień powstania prawa | `/konto?tab=zadluzenie` (podgląd zaświadczenia do druku) | ✓ |
| Podgląd e-ZLA | `/konto?tab=ezla` | ✓ |
| PUE/eZUS: pytanie, dane konta | `/konto?tab=wiadomosci`, `/konto` (Moje dane) | ✓ (odpowiedzi szablonowe, bez AI) |
| Wnioski o urlopy (własne wzory) | `/wnioski` – 7 wzorów wg rozporządzenia Dz.U. 2025 poz. 322 | ✓ |
| Wnioski o świadczenia (wzory ZUS) | `/wnioski?formularz=zam` – pola formularza ZAM w wersji od 24.10.2026 | ✓ |
| Wniosek o odpis aktu urodzenia | `/wnioski?formularz=odpis-aktu` + link do gov.pl | ✓ |
| Wysłanie wniosku | „Wyślij do pracodawcy / ZUS / urzędu” → `POST /api/mock/wnioski` → numer sprawy i statusy | ✓ |
| Informacje o fundacjach | `/trudne-sytuacje` | ✓ |
| Przekierowania: zus.pl, gov.pl (urlop rodzicielski), PIP | `/przydatne-linki`, linki w treści | ✓ |
| Znak „SYMULACJA” na ekranach i dokumentach | wszystkie symulowane ekrany, podglądy do druku ze znakiem wodnym | ✓ |

### Panel administracyjny, wymagania formalne i techniczne

| Wymaganie | Gdzie | Status |
|-----------|-------|--------|
| Zmiana parametrów (stawki, wymiary) | `/admin` – 7 zakładek, walidacja, opis zmiany, wersjonowanie, historia z różnicami, reset, eksport/import JSON | ✓ |
| Szczegółowy opis i tytuł | ten dokument | ✓ |
| Prezentacja ≤ 10 slajdów | [prezentacja.html](prezentacja.html) | ✓ |
| Film ≤ 3 min w otwartym repozytorium | skrypt gotowy ([film-skrypt.md](film-skrypt.md)), strona `/o-projekcie` | ◐ czeka na nagranie |
| Repozytorium kodu | GitHub (link wyżej) | ✓ |
| Zrzuty ekranu | rozdział 8, `docs/screens/` | ✓ |
| Demo online z testowaniem spraw | `/sprawy`, `/demo/<persona>` | ◐ czeka na wdrożenie na Vercel |
| Pełna responsywność | każdy ekran; test E2E „brak poziomego scrolla” na 13 stronach, iPhone 13 i desktop | ✓ |
| Wskazanie funkcji AI | rozdział 6 | ✓ |
| Wskazanie rozwiązań zewnętrznych | rozdział 7 | ✓ |
| React/Next.js, backend JS, REST API | Next.js 16 (App Router) + route handlers, [docs/api.md](api.md) | ✓ |
| Poprawność wyliczeń na przykładowych wnioskach, upload lub wybór | `/sprawy`, `npm run cases` (10/10 zgodnych) | ✓ |
| Potencjał produkcyjny | rozdział 10 | ✓ |

## 4. Architektura

```mermaid
flowchart LR
  subgraph UI["UI – Next.js App Router (React, RWD)"]
    P1["/logowanie · /kreator · /sprawy"]
    P2["/moja-sytuacja · /kalkulator"]
    P3["/co-i-gdzie · /wnioski · /konto"]
    P4["/trudne-sytuacje · /admin"]
    S[("store sesji<br/>(sessionStorage)")]
  end
  subgraph API["REST API – route handlers (zod)"]
    A1["/api/calculate · /api/eligibility · /api/pregnancy"]
    A2["/api/cases · /api/cases/upload"]
    A3["/api/params (+ history, reset)"]
    A4["/api/mock/* (mObywatel, ZUS, PUE, wnioski)"]
  end
  subgraph ENG["Silnik – czyste funkcje TypeScript"]
    E1["calcBase · checkEligibility · calcEntitlement"]
    E2["buildSchedule · calcPregnancy · collectWarnings"]
    E3["buildFilingGuide · src/forms (wnioski)"]
  end
  PS[("ParamsStore<br/>plik / pamięć / Upstash Redis")]
  M[("Mocki integracji<br/>persony, e-ZLA, zadłużenie")]
  F[("Sprawy: src/fixtures<br/>+ cases-private (lokalnie)")]
  UI --> API
  A1 --> ENG
  A2 --> ENG
  A2 --> F
  A3 --> PS
  A1 -. parametry .-> PS
  A4 --> M
```

Zasada: **silnik nie zna Reacta ani Next.js** – dostaje dane sprawy i parametry jako argumenty i zwraca wynik z krokami wyjaśnienia i źródłami prawnymi. Dzięki temu ten sam kod liczy dla UI, API, runnera spraw i testów.

| Katalog | Zawartość |
|---------|-----------|
| `src/engine` | logika zasiłków: podstawa wymiaru, prawo do zasiłku, wymiar urlopów, harmonogram i kwoty, ciąża, ostrzeżenia, „co i gdzie złożyć”, walidacja wejścia (zod) |
| `src/forms` | definicje wniosków: pola, walidacja, wypełnianie danymi z planu, tekst, załączniki, terminy |
| `src/config/params.default.json` | domyślne parametry (stawki, wymiary, terminy) |
| `src/server` | ParamsStore, autoryzacja admina, mocki integracji, wczytywanie spraw |
| `src/app` | ekrany (App Router) i REST API (`src/app/api`) |
| `src/components` | komponenty wspólne; `ui/` – shadcn/ui |
| `src/data` | organizacje charytatywne i przydatne linki (ze źródłem i datą weryfikacji) |
| `src/fixtures/cases` | 10 syntetycznych spraw z ręcznie wyliczonym wynikiem |
| `e2e`, `src/**/__tests__` | testy E2E (Playwright) i jednostkowe (vitest) |

API: [docs/api.md](api.md).

## 5. Jak testować

**Najszybciej – linki demonstracyjne** (logują fikcyjną osobę bez klikania):

| Link | Osoba | Co pokazuje |
|------|-------|-------------|
| `/demo/anna` | umowa o pracę, duży pracodawca, w ciąży | płatnik wypłaca, 81,5% vs 100% + 70%, e-ZLA z kodem B |
| `/demo/kasia` | działalność z dobrowolnym chorobowym, 10 dni po porodzie | wypłaca ZUS, termin 21 dni, zadłużenie w przeszłości |
| `/demo/ola` | działalność bez chorobowego, w ciąży | **brak prawa** z wyjaśnieniem, zadłużenie składkowe |
| `/demo/marta` | umowa zlecenie, wcześniak | urlop uzupełniający |
| `/demo/ewa-piotr` | adopcja 2-latka | urlop na warunkach macierzyńskiego |
| `/demo/magda` | likwidacja pracodawcy w ciąży | zasiłek w wysokości macierzyńskiego |

Dodaj `?do=kalkulator`, `?do=co-i-gdzie`, `?do=wnioski` albo `?do=konto`, żeby od razu otworzyć inny ekran.

**Przykładowe sprawy:** `/sprawy` → „Sprawdź tę sprawę” albo „Wgraj sprawę (.json)”. Przy sprawach z wynikiem ZUS widać porównanie z naszym wyliczeniem (Zgodne / Różnica). Format pliku: [docs/przyklady-zus.md](przyklady-zus.md#format-pliku-casefile). Ten sam zestaw sprawdza lokalnie `npm run cases`, a prywatne sprawy od ZUS można wrzucić do `cases-private/` (nie trafiają do repozytorium ani do builda).

**Panel admina:** `/admin`, hasło `demo-zus`. Zmień np. stawkę „Wniosek o cały urlop” na 0,9 i zapisz – kalkulator od razu liczy według nowej wartości. „Domyślne” przywraca parametry.

**Testy automatyczne:** `npm test` (173 testy jednostkowe), `npm run cases` (10 spraw), `npm run e2e` (27 testów E2E na desktopie i iPhonie 13, w tym przejście ścieżki z filmu).

## 6. Sztuczna inteligencja

### AI w działaniu aplikacji

**Obecna wersja nie używa AI w działaniu aplikacji.** Wszystkie wyliczenia, ostrzeżenia, rekomendacje wniosków i odpowiedzi w symulacji „Zapytaj ZUS” pochodzą z deterministycznych reguł opisanych w kodzie i parametrach – z podaną podstawą prawną. To świadomy wybór: wynik, który ma porównywać się z decyzją ZUS, musi być powtarzalny i sprawdzalny.

Zaplanowane (zadania P2, jeszcze nie zrobione):

| Funkcja | Zakres | Ograniczenia |
|---------|--------|--------------|
| Odczyt wgranego PDF (ZAM, Z-3, Z-3a, zaświadczenia) – KAN-36 | model językowy wyciąga dane do formularza sprawy, użytkownik je zatwierdza przed wyliczeniem | wynik zawsze do weryfikacji; obliczenia nadal liczy silnik regułowy |
| Asystent „Zapytaj o zasiłki” – KAN-37 | odpowiedzi na pytania w oparciu o parametry, silnik i sytuację użytkownika | nie podejmuje decyzji, nie zastępuje ZUS |

Każda taka funkcja dostanie w UI plakietkę **„AI”** (komponent `AiBadge`) i opis w tej sekcji.

### AI w procesie twórczym

Kod, testy i dokumentację tworzyliśmy z pomocą asystenta programisty **Claude (Anthropic) w Claude Code**: generowanie i refaktoryzacja kodu, pisanie testów, wyszukiwanie i streszczanie źródeł prawnych, zrzuty ekranu i przeglądy zmian. Każde zadanie z Jiry kończy się testami (`npm test`, typecheck, build) i komentarzem z założeniami do weryfikacji przez zespół. Reguły prawne sprawdzaliśmy w źródłach (treść rozporządzeń z api.sejm.gov.pl, Poradnik ZUS dla rodziców 2026, gov.pl, formularz ZAM z zus.pl), a nie „z pamięci” modelu – miejsca wymagające jeszcze weryfikacji są opisane w [docs/POSTEP.md](POSTEP.md).

## 7. Rozwiązania zewnętrzne

### Biblioteki (package.json)

| Biblioteka | Do czego | Licencja |
|------------|----------|----------|
| next 16, react 19, react-dom 19 | framework UI i REST API | MIT |
| typescript | język | Apache-2.0 |
| tailwindcss 4, @tailwindcss/turbopack, tw-animate-css | style | MIT |
| shadcn (+ komponenty shadcn/ui skopiowane do `src/components/ui`), radix-ui | komponenty dostępnego UI | MIT |
| class-variance-authority | warianty komponentów | Apache-2.0 |
| cn | łączenie klas CSS | MIT |
| lucide-react | ikony | ISC |
| @fontsource-variable/inter | font Inter (lokalnie, bez Google Fonts) | OFL-1.1 |
| next-themes | motyw jasny/ciemny | MIT |
| sonner | powiadomienia (toast) | MIT |
| recharts | wykres wypłat | MIT |
| react-hook-form, @hookform/resolvers | formularz kreatora | MIT |
| zod | walidacja danych (API, formularze, parametry) | MIT |
| zustand | stan sesji w przeglądarce | MIT |
| date-fns | operacje na datach | MIT |
| vitest | testy jednostkowe | MIT |
| @playwright/test | testy E2E i zrzuty ekranu | Apache-2.0 |
| eslint, eslint-config-next | lint | MIT |

### Usługi (opcjonalne)

- **Vercel** – hosting demo.
- **Upstash Redis** – trwałe przechowywanie parametrów z panelu admina na Vercelu (bez niego – pamięć).

Aplikacja nie łączy się z prawdziwymi systemami ZUS, mObywatel ani gov.pl. Wszystkie integracje to symulacje na fikcyjnych danych; nie kopiujemy logotypów ani wyglądu tych systemów.

### Źródła danych i treści

- Ustawa z 25.06.1999 o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa, Kodeks pracy (ISAP).
- Rozporządzenie MRPiPS z 11.03.2025 w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem (Dz.U. 2025 poz. 322) – treść wzorów wniosków o urlopy.
- Rozporządzenie w sprawie dokumentów do zasiłków (Dz.U. 2026 poz. 1316).
- Formularz ZUS ZAM (wersja od 24.10.2026) – pola wniosku o zasiłek macierzyński.
- Poradnik ZUS dla rodziców i opiekunów dzieci (2026).
- gov.pl: „Łatwiejszy dostęp do świadczeń po stracie ciąży”, urlop rodzicielski, „Za życiem”, rejestr stanu cywilnego; PIP: rodzicielstwo.
- Strony organizacji charytatywnych (nazwa, KRS, zakres pomocy) – stan na 2026-11-21.

## 8. Zrzuty ekranu

| Ekran | Desktop | Mobile |
|-------|---------|--------|
| Start – trzy ścieżki wejścia | ![](screens/01-start-desktop.jpg) | ![](screens/01-start-mobile.jpg) |
| Logowanie (symulacja mObywatela) | ![](screens/02-logowanie-desktop.jpg) | ![](screens/02-logowanie-mobile.jpg) |
| Moja sytuacja | ![](screens/03-moja-sytuacja-desktop.jpg) | ![](screens/03-moja-sytuacja-mobile.jpg) |
| Kalkulator z osią czasu | ![](screens/04-kalkulator-desktop.jpg) | ![](screens/04-kalkulator-mobile.jpg) |
| Co i gdzie złożyć | ![](screens/05-co-i-gdzie-desktop.jpg) | ![](screens/05-co-i-gdzie-mobile.jpg) |
| Wniosek – podgląd przed wysyłką | ![](screens/06-wniosek-desktop.jpg) | ![](screens/06-wniosek-mobile.jpg) |
| Konto PUE (symulacja) – e-ZLA | ![](screens/07-konto-pue-desktop.jpg) | ![](screens/07-konto-pue-mobile.jpg) |
| Trudne sytuacje | ![](screens/08-trudne-sytuacje-desktop.jpg) | ![](screens/08-trudne-sytuacje-mobile.jpg) |
| Przykładowe sprawy | ![](screens/09-sprawy-desktop.jpg) | ![](screens/09-sprawy-mobile.jpg) |
| Panel administracyjny | ![](screens/10-admin-desktop.jpg) | ![](screens/10-admin-mobile.jpg) |

Zrzuty generuje `npm run screens` (Playwright).

## 9. Ograniczenia i założenia

- **Wynik ma charakter informacyjny** i nie zastępuje decyzji ZUS ani płatnika.
- Podstawa wymiaru liczona z przychodów z 12 miesięcy (pracownik) albo z zadeklarowanej podstawy (działalność); bez szczegółów takich jak uzupełnianie wynagrodzenia za miesiące nieprzepracowane w całości ponad zakres kreatora.
- Części urlopu rodzicielskiego układane są kolejno – bez jednoczesnego korzystania przez oboje rodziców.
- Łączenie z pracą liczone jako zasiłek × (1 − wymiar etatu) za proporcjonalnie wydłużony okres.
- Po martwym urodzeniu przyjęliśmy brak urlopu ojcowskiego (urlop przysługuje ojcu wychowującemu dziecko).
- Część numerów artykułów pochodzi z wiedzy zespołu i jest oznaczona do weryfikacji w [docs/POSTEP.md](POSTEP.md); zweryfikowane w źródłach: zasady po stracie ciąży, urlop uzupełniający, treść wniosków o urlopy, pola ZAM.
- Symulacje (mObywatel, ZUS, PUE, e-ZLA, wysyłka wniosków) działają na fikcyjnych danych; wiadomości „Zapytaj ZUS” są w pamięci serwera.
- Dane osoby zostają w przeglądarce (sessionStorage); numer rachunku z ZAM nie jest nigdzie zapisywany.

## 10. Potencjał wdrożeniowy

- **Integracje gotowe do podmiany:** mocki mają ten sam kształt co docelowe usługi (profil ubezpieczonego, e-ZLA, stan rozliczeń, wysyłka wniosku). Podłączenie API ZUS/PUE i logowania mObywatel/węzła krajowego oznacza wymianę warstwy `src/server/mocks`, bez zmian w silniku i UI.
- **Przepisy jako parametry:** stawki, wymiary, terminy i progi są w wersjonowanych parametrach z historią zmian i panelem administracyjnym – zmiana przepisów nie wymaga wdrożenia kodu.
- **Silnik jako usługa:** czyste funkcje + REST API (`/api/calculate`, `/api/eligibility`, `/api/pregnancy`) mogą zasilać PUE, aplikację mZUS albo systemy kadrowe pracodawców.
- **Jakość:** 173 testy jednostkowe (każda reguła), runner spraw porównujący wynik z decyzją ZUS (gotowy na prawdziwe zanonimizowane sprawy), 26 testów E2E na desktopie i telefonie, typecheck i lint.
- **Dostępność i RWD:** semantyczne komponenty Radix/shadcn, etykiety pól, komunikaty `aria-live`, obsługa klawiatury, brak poziomego scrolla na telefonie, druk dokumentów.
- **Prywatność:** brak danych osobowych na serwerze, prawdziwe sprawy ZUS tylko lokalnie i poza buildem.
