# Prezentacja – Zasiłkowy Przewodnik Przyszłego Rodzica

10 slajdów. Wersja do wyświetlenia: [prezentacja.html](prezentacja.html) (strzałki ← →, „N” – notatki, druk → PDF). Tekst wystąpienia i Q&A: [pitch-notatki.md](pitch-notatki.md).

---

## 1. Zasiłkowy Przewodnik Przyszłego Rodzica

- Prawo do zasiłków, ich wysokość i gotowe wnioski – w jednym miejscu
- HackNation 2026 · zadanie ZUS
- Zespół: _imiona uzupełni zespół_

> **Notatka:** Dzień dobry. Jesteśmy zespołem … Zbudowaliśmy przewodnik, który w kilka minut mówi przyszłemu rodzicowi, co mu przysługuje, ile dostanie i jakie wnioski ma złożyć.

---

## 2. Rodzice nie wiedzą, co im przysługuje – a skutki ponosi i rodzina, i ZUS

- Brak wiedzy o uprawnieniach: kto ma prawo do zasiłku, od kiedy, w jakiej wysokości
- Zaskakujące decyzje: inna kwota, inny płatnik, inny okres niż oczekiwany
- Błędne lub spóźnione wnioski i spory, które wynikają z niezrozumienia przepisów
- Przepisy zależą od wielu warunków: tytuł ubezpieczenia, liczba dzieci, adopcja, praca w trakcie urlopu

> **Notatka:** To problemy nazwane w treści zadania ZUS. Przykład: osoba na działalności bez dobrowolnego chorobowego dowiaduje się o braku zasiłku dopiero po porodzie. Albo wniosek o cały urlop złożony 22. dnia – i zasiłek inny, niż planowała rodzina.

---

## 3. Jeden przewodnik: od danych do gotowego wniosku

- Ustalamy uprawnienia indywidualnie, liczymy wszystkie świadczenia jednym kalkulatorem i wypełniamy wnioski
- Trzy ścieżki wejścia: logowanie mObywatel (dane z ZUS), kreator ręczny, przykładowa sprawa (wybór lub upload)
- Każdy wynik z wyjaśnieniem krok po kroku i podstawą prawną

> **Notatka:** Niezależnie od ścieżki dane trafiają do tego samego modelu sprawy i tego samego silnika. Dzięki temu wynik jest ten sam w kalkulatorze, we wnioskach i w porównaniu z decyzją ZUS.

---

## 4. „Moja sytuacja”: odpowiedź w 30 sekund

- Czy jesteś ubezpieczona i od kiedy masz prawo do zasiłku
- Kto wypłaca: płatnik (powyżej 20 ubezpieczonych) czy ZUS – i gdzie złożyć wniosek
- Podstawa wymiaru krok po kroku; kwoty w wariancie 81,5% i 100% + 70%; świadczenia w ciąży

_Zrzut: docs/screens/03-moja-sytuacja-desktop.jpg_

> **Notatka:** Anna, umowa o pracę, w ciąży. Widzi zielone „Jesteś ubezpieczona chorobowo”, że wypłaca pracodawca, jak powstała podstawa 6040,30 zł i ile dostanie w każdym wariancie. Dla Oli, która nie opłaca dobrowolnego chorobowego, ekran mówi wprost: brak prawa – i dlaczego.

---

## 5. Jeden kalkulator zamiast pięciu

- Oś czasu obojga rodziców: macierzyński, rodzicielski w częściach, ojcowski, przejęcie urlopu
- Wieloraczki, „Za życiem”, wcześniak, adopcja i rodzina zastępcza, łączenie urlopu z pracą
- Porównanie 81,5% za całość z 100% + 70% oraz wypłaty miesiąc po miesiącu

_Zrzut: docs/screens/04-kalkulator-desktop.jpg_

> **Notatka:** Tak jak rekomendował ZUS – wszystkie kalkulatory to jeden kalkulator z opcjami. Rodzina przesuwa części urlopu, dodaje pracę na pół etatu i od razu widzi, jak zmienia się okres i kwota.

---

## 6. Mniej błędnych wniosków: ostrzeżenia i „co i gdzie złożyć”

- Ostrzeżenia przed utratą lub obniżeniem uprawnień: termin 21 dni, przepadające 9 tygodni ojca, zadłużenie składkowe, ochrona z Kodeksu pracy
- Lista kroków z terminami, załącznikami i adresatem: pracodawca czy ZUS, online przez PUE/eZUS
- Trudne sytuacje: strata dziecka, wcześniak, choroba mamy – z organizacjami charytatywnymi

> **Notatka:** Tu jest największa wartość dla ZUS: mniej poprawek, mniej odwołań. Każde ostrzeżenie ma źródło w przepisach. Sekcja trudnych sytuacji powstała w spokojnym języku i podaje tylko zweryfikowane fundacje.

---

## 7. Symulacje integracji: tak może to działać z systemami ZUS

- mObywatel → dane z ZUS (okresy ubezpieczenia, płatnik, przychody)
- PUE/eZUS: e-ZLA z kodem B, zaświadczenie o zadłużeniu na dzień porodu, „Zapytaj ZUS”
- Wnioski: 7 własnych wzorów o urlopy, ZAM, odpis aktu urodzenia – wypełnione z kalkulatora, wysyłka ze statusem

_Zrzut: docs/screens/06-wniosek-desktop.jpg_

> **Notatka:** Wszystkie integracje są oznaczone jako SYMULACJA i działają na fikcyjnych osobach. Mają jednak kształt docelowych usług, więc podłączenie prawdziwego API nie wymaga zmian w silniku.

---

## 8. Sprawdzalne wyliczenia: wynik ZUS obok naszego

- Wybierz lub wgraj sprawę – aplikacja pokazuje decyzję ZUS i nasze wyliczenie obok siebie
- 10 syntetycznych spraw (m.in. bliźnięta „Za życiem”, wcześniak, martwe urodzenie) – wszystkie zgodne
- 183 testy reguł i logiki, 31 testów E2E na komputerze i telefonie

_Zrzut: docs/screens/09-sprawy-desktop.jpg_

> **Notatka:** Jury może wgrać własne sprawy. Lokalnie runner porównuje także prawdziwe sprawy ZUS, które trzymamy poza repozytorium.

---

## 9. Gotowe do wdrożenia

- Silnik jako czyste funkcje + REST API: ten sam kod dla UI, PUE czy systemów kadrowych
- Przepisy jako parametry: panel administracyjny z wersjami, historią i resetem – zmiana stawki bez programisty
- AI tylko tam, gdzie pomaga: odczyt wgranych PDF (ZAM, Z-3) do formularza, który użytkownik zatwierdza; wyliczenia są regułowe

> **Notatka:** Pokażemy to na żywo: zmieniam stawkę w panelu, kalkulator od razu liczy inaczej. AI świadomie nie liczy zasiłków – wynik ma się zgadzać z decyzją ZUS co do grosza. AI tylko odczytuje wgrane PDF, a człowiek zatwierdza dane.

---

## 10. Przyszły rodzic wie, co mu przysługuje – zanim złoży wniosek

- Indywidualne uprawnienia, jeden kalkulator, gotowe wnioski, wsparcie w trudnych sytuacjach
- Demo: _link po wdrożeniu_ · film: _link_ · repozytorium: github.com/Hubertcior/zasilkowy-przewodnik
- Dziękujemy – zapraszamy do pytań

> **Notatka:** Podsumowanie jednym zdaniem i zaproszenie do demo. Linki są też w README.
