# Film (≤ 3 min) – skrypt, plan ujęć, publikacja

Długość docelowa: **2:45** (15 s zapasu do limitu 3:00). Lektor ok. 360 słów – czytany spokojnie mieści się w czasie. Wszystkie etykiety przycisków poniżej są przepisane z kodu (stan na commit z KAN-35).

## 1. Skrypt

| Czas | Ekran / akcja | Lektor | Napis na ekranie |
|------|---------------|--------|------------------|
| 0:00–0:15 | Strona startowa `/` (desktop). Powolny najazd na trzy kafelki ścieżek. | Przyszli rodzice często nie wiedzą, jakie mają prawa do zasiłków. Skutki to zaskakujące decyzje, błędne wnioski i spory – tak problem opisuje ZUS. Pokażemy, jak to zmienić. | Zasiłkowy Przewodnik Przyszłego Rodzica |
| 0:15–0:35 | Klik **„Zaloguj się przez mObywatel”** → na karcie Anny **„Zaloguj jako Anna”** → ekran zgody → **„Wyrażam zgodę – pobierz dane”**. | Anna loguje się przez mObywatel – w demo to symulacja na fikcyjnych danych. Po zgodzie aplikacja pobiera z ZUS okresy ubezpieczenia, płatnika i przychody. | SYMULACJA – dane fikcyjne |
| 0:35–1:00 | `/moja-sytuacja`: zielone **„Jesteś ubezpieczona chorobowo”**, sekcja **„Kto wypłaca zasiłek”** (wypłaca płatnik), rozwinięcie **„Jak to policzyliśmy – krok po kroku”**, kwoty 81,5% i 100%/70%. | W pół minuty Anna wie, że ma prawo do zasiłku, że wypłaci go pracodawca, bo zgłasza ponad 20 osób, i jak powstała podstawa: 6040 złotych 30 groszy – krok po kroku, z podstawą prawną. | Ubezpieczenie · kto wypłaca · podstawa |
| 1:00–1:40 | Klik **„Zaplanuj w kalkulatorze”** → `/kalkulator`: oś czasu (Mama/Tata), karta **„81,5% za całość czy 100% + 70%?”**. Wyłącz i włącz przełącznik **„Wniosek o cały urlop (81,5%)”**. Wpisz **„Liczba dzieci”: 2**, zaznacz **„Zaświadczenie „Za życiem””** – nagłówek pokazuje **„Urlop rodzicielski (67 tyg., …)”**. W części rodzicielskiego wybierz **„Praca”: ½ etatu** – pasek na osi się wydłuża. | Wszystkie kalkulatory to jeden kalkulator, tak jak rekomendował ZUS. Na osi czasu widać urlopy obojga rodziców i wypłaty miesiąc po miesiącu. Anna porównuje 81,5 procent za całość ze stu procentami i siedemdziesięcioma. Bliźnięta z zaświadczeniem „Za życiem”? Urlop rodzicielski rośnie do 67 tygodni. A praca na pół etatu wydłuża urlop i proporcjonalnie zmienia zasiłek. | Jeden kalkulator z opcjami |
| 1:40–2:00 | Menu **„Przykładowe sprawy”** → karta **„Bliźnięta z zaświadczeniem „Za życiem””** → **„Sprawdź tę sprawę”** → przewinięcie do **„Wynik ZUS w sprawie a nasze wyliczenie”** z plakietką **„Zgodne”**. Krótko pokazać przycisk **„Wgraj sprawę (.json)”**. | Wyliczenia można sprawdzić. Wybieramy przykładową sprawę albo wgrywamy własną – aplikacja pokazuje wynik ZUS obok naszego. Wszystkie przykładowe sprawy są zgodne. | Wynik ZUS = nasze wyliczenie |
| 2:00–2:20 | Otwórz `/demo/anna?do=co-i-gdzie` (wcześniej przygotowana karta) → przewiń kroki z terminami → **„Wypełnij wniosek”** → przy **„Macierzyński przed porodem”** **„Wypełnij”** → wpisz **„Miejscowość”** → **„Dalej”** → **„Podgląd wniosku”** → **„Wyślij do pracodawcy”** → statusy **„złożony” → „przyjęty”**. | Aplikacja mówi, co, gdzie i do kiedy złożyć, a potem sama wypełnia wniosek danymi z kalkulatora. Podgląd, wysyłka – oczywiście symulowana – i numer sprawy. | Wniosek wypełniony z kalkulatora |
| 2:20–2:35 | Stopka → **„Panel administracyjny”** → hasło `demo-zus` → **„Zaloguj”** → zakładka **„Stawki”**, pole **„Wniosek o cały urlop”** zmień na 0,9 → **„Zapisz parametry”** (komunikat „Zapisano wersję …”). Przejście do kalkulatora – nowa kwota. Na koniec w panelu **„Domyślne”**. | Gdy zmienią się przepisy, administrator zmienia parametr w panelu – bez programisty. Kalkulator od razu liczy według nowej stawki, a każda zmiana trafia do historii. | Przepisy jako parametry |
| 2:35–2:45 | Telefon (390 px): „Moja sytuacja” z zakładkami Mama/Tata, dolna nawigacja, szybkie przewinięcie kalkulatora. Plansza końcowa z linkiem. | Wszystko działa też na telefonie. Zasiłkowy Przewodnik – rodzic wie, co mu przysługuje, zanim złoży wniosek. | github.com/Hubertcior/zasilkowy-przewodnik · link do demo |

## 2. Przygotowanie

**Dane demo**

| Ujęcie | Dane | Jak uzyskać |
|--------|------|-------------|
| Logowanie, moja sytuacja, kalkulator, wniosek | persona **Anna Kowalczyk** (umowa o pracę, 120 osób w firmie, w ciąży) | `/logowanie` → „Zaloguj jako Anna” albo skrót `/demo/anna` |
| Przykładowa sprawa | **„Bliźnięta z zaświadczeniem „Za życiem””** (`blizneta-za-zyciem`) | `/sprawy` |
| Admin | hasło `demo-zus` (albo `ADMIN_PASSWORD` na produkcji) | stopka → „Panel administracyjny” |
| Mobile | dowolna persona, np. `/demo/kasia` | DevTools (iPhone 13) albo telefon |

**Przed nagraniem**

- Nagrywaj z wersji produkcyjnej (Vercel) albo `npm run build && npm start` – bez nakładki deweloperskiej Next.js.
- Okno przeglądarki 1440×900, zoom 100%, tryb jasny, ukryte zakładki i rozszerzenia. Kursor powiększony (ułatwia śledzenie).
- Wyczyść dane strony (nowe okno incognito), żeby nie było starych sesji.
- W panelu admina po ujęciu kliknij **„Domyślne”**, żeby demo dla jury miało domyślne stawki.
- Przygotuj w osobnych kartach: `/demo/anna?do=co-i-gdzie` i `/sprawy`.

## 3. Lista ujęć

| # | Rozdzielczość | Ujęcie | Kolejność kliknięć |
|---|---------------|--------|--------------------|
| 1 | desktop 1440 | Start | wejście na `/`, najazd |
| 2 | desktop 1440 | Logowanie | „Zaloguj się przez mObywatel” → „Zaloguj jako Anna” → „Wyrażam zgodę – pobierz dane” |
| 3 | desktop 1440 | Moja sytuacja | przewinięcie: Ubezpieczenie → Kto wypłaca zasiłek → „Jak to policzyliśmy – krok po kroku” |
| 4 | desktop 1440 | Kalkulator | „Zaplanuj w kalkulatorze” → przełącznik 81,5% (wył./wł.) → „Liczba dzieci” 2 → „Zaświadczenie „Za życiem”” → część rodzicielskiego „Praca: ½ etatu” |
| 5 | desktop 1440 | Sprawy | „Przykładowe sprawy” → „Sprawdź tę sprawę” (bliźnięta) → przewinięcie do „Zgodne” |
| 6 | desktop 1440 | Co i gdzie + wniosek | karta `/demo/anna?do=co-i-gdzie` → „Wypełnij wniosek” → „Wypełnij” (Macierzyński przed porodem) → Miejscowość → „Dalej” → „Podgląd wniosku” → „Wyślij do pracodawcy” → poczekaj na „przyjęty” (ok. 4 s) |
| 7 | desktop 1440 | Admin | „Panel administracyjny” → hasło → „Zaloguj” → „Wniosek o cały urlop” = 0,9 → „Zapisz parametry” → kalkulator → wróć → „Domyślne” |
| 8 | mobile 390 | Telefon | `/demo/kasia` → zakładki Mama/Tata → menu dolne „Kalkulator” → przewinięcie |
| 9 | — | Plansza końcowa | link do repozytorium i demo (np. slajd 10 z `docs/prezentacja.html`) |

Montaż: przy ujęciach 4 i 6 można przyspieszyć wpisywanie (×1,5–2). Napisy w dolnej części ekranu, krótko, kontrastowo. Muzyka cicho pod lektorem albo bez.

## 4. Publikacja

1. Wyeksportuj MP4 (1080p, H.264). Sprawdź czas: **≤ 3:00**.
2. Opublikuj w otwartym miejscu:
   - **YouTube** – widoczność „Publiczny” albo „Niepubliczny” (każdy z linkiem może obejrzeć); tytuł: „Zasiłkowy Przewodnik Przyszłego Rodzica – HackNation 2026 (ZUS)”, w opisie link do repozytorium;
   - albo plik w repozytorium (`docs/film.mp4`), jeśli ma mniej niż 100 MB (limit GitHuba dla pojedynczego pliku).
3. Wklej link w:
   - `src/data/project.ts` → `videoUrl` (strona `/o-projekcie` sama osadzi film; dla YouTube używa youtube-nocookie.com),
   - `README.md` (wiersz „Film”),
   - `docs/opis-projektu.md` (tabela na górze, wiersz „Film”, i status w tabeli wymagań formalnych),
   - `docs/prezentacja.html` i `docs/prezentacja.md` (slajd 10).
4. Albo napisz w kolejnej sesji: „dodaj link do filmu: …” – zmiany zostaną zrobione automatycznie.
