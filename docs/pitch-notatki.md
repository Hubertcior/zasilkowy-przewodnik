# Pitch – notatki prelegenta i Q&A

Slajdy: [prezentacja.html](prezentacja.html) (treść: [prezentacja.md](prezentacja.md)). Szczegóły techniczne: [opis-projektu.md](opis-projektu.md).

## Wystąpienie – ok. 3 minuty (≈ 420 słów)

**[Slajd 1 – 10 s]** Dzień dobry, jesteśmy zespołem … Przygotowaliśmy Zasiłkowy Przewodnik Przyszłego Rodzica – jedno miejsce, w którym rodzic sprawdza, co mu przysługuje, ile dostanie i jakie wnioski ma złożyć.

**[Slajd 2 – 25 s]** ZUS w treści zadania nazwał problem wprost: brak wiedzy o uprawnieniach, zaskakujące decyzje, błędne wnioski i spory. Przepisy zależą od tytułu ubezpieczenia, liczby dzieci, adopcji, pracy w trakcie urlopu. Osoba na działalności bez dobrowolnego chorobowego często dowiaduje się o braku zasiłku dopiero po porodzie. A wniosek o cały urlop złożony 22. dnia po porodzie zmienia wysokość zasiłku.

**[Slajd 3 – 20 s]** Nasze rozwiązanie: ustalamy uprawnienia indywidualnie, liczymy wszystkie świadczenia jednym kalkulatorem i wypełniamy wnioski. Wejść można na trzy sposoby: przez symulację mObywatela z danymi z ZUS, przez kreator ręczny albo wybierając lub wgrywając przykładową sprawę.

**[Slajd 4 – 25 s]** Ekran „Moja sytuacja” odpowiada w pół minuty: czy jesteś ubezpieczona, kto wypłaca zasiłek – pracodawca czy ZUS – i jak powstała podstawa wymiaru, krok po kroku, z podstawą prawną. Jeśli prawa nie ma, mówimy to wprost i wyjaśniamy dlaczego.

**[Slajd 5 – 25 s]** Zgodnie z rekomendacją ZUS mamy jeden kalkulator z opcjami: oboje rodzice na osi czasu, wieloraczki, „Za życiem”, wcześniak, adopcja i piecza, łączenie urlopu z pracą. Rodzina od razu widzi, czy lepiej wybrać 81,5% za całość, czy 100% i 70%.

**[Slajd 6 – 20 s]** Żeby było mniej błędnych wniosków, ostrzegamy przed utratą uprawnień – na przykład przed przepadającymi dziewięcioma tygodniami ojca – i mówimy, co, gdzie i do kiedy złożyć. Osobna sekcja pomaga w trudnych sytuacjach i wskazuje zweryfikowane fundacje.

**[Slajd 7 – 20 s]** Symulujemy integracje: dane z ZUS, e-ZLA z kodem B, zaświadczenie o zadłużeniu, pytanie do ZUS i wysyłkę wniosków. Siedem wzorów wniosków o urlopy przygotowaliśmy według rozporządzenia, a ZAM odwzorowuje aktualny formularz ZUS.

**[Slajd 8 – 20 s]** Wyliczenia są sprawdzalne: przy przykładowej sprawie pokazujemy decyzję ZUS obok naszego wyniku. Wszystkie 10 spraw jest zgodnych, mamy 183 testy reguł i logiki oraz 31 testów na komputerze i telefonie.

**[Slajd 9 – 20 s]** To jest gotowe do wdrożenia: silnik udostępniamy przez REST API, a przepisy są parametrami w panelu administracyjnym z wersjami i historią. AI świadomie nie liczy zasiłków – wynik ma się zgadzać z decyzją co do grosza. AI odczytuje tylko wgrane PDF do formularza, który człowiek zatwierdza.

**[Slajd 10 – 15 s]** Przyszły rodzic wie, co mu przysługuje, zanim złoży wniosek. Zapraszamy do demo – linki są na slajdzie i w README. Dziękujemy.

## Wersja 60 sekund

Rodzice często nie wiedzą, jakie mają prawa do zasiłków, a skutkiem są zaskakujące decyzje, błędne wnioski i spory – tak opisał problem ZUS. Zasiłkowy Przewodnik ustala uprawnienia indywidualnie: z danych z ZUS przez symulację mObywatela, z kreatora albo z przykładowej sprawy. Jeden kalkulator liczy zasiłek chorobowy w ciąży i macierzyński we wszystkich wariantach – dla obojga rodziców, z wieloraczkami, „Za życiem”, adopcją i pracą w trakcie urlopu – i pokazuje to na osi czasu. Każdy wynik ma wyjaśnienie i podstawę prawną, a aplikacja ostrzega przed utratą uprawnień, mówi, co i gdzie złożyć, i wypełnia wnioski. Wyliczenia porównujemy z decyzjami ZUS na przykładowych sprawach, a przepisy zmienia się w panelu administracyjnym bez programisty. Dzięki temu rodzic wie, co mu przysługuje, zanim złoży wniosek.

## Q&A

**1. Skąd wiecie, że wyliczenia są zgodne z przepisami?**
Reguły w silniku mają przypisaną podstawę prawną (widać ją w aplikacji przy każdym wyniku i ostrzeżeniu). Kluczowe zasady sprawdziliśmy w źródłach: treść rozporządzenia o wnioskach (Dz.U. 2025 poz. 322), Poradnik ZUS dla rodziców 2026, formularz ZAM, gov.pl. Każda reguła ma testy (183), a przykładowe sprawy z ręcznie policzonym wynikiem są zgodne w 10 na 10. Miejsca do dalszej weryfikacji mamy spisane.

**2. Co, gdy zmienią się przepisy – np. stawka albo wymiar urlopu?**
Stawki, wymiary, terminy i progi to parametry, nie kod. Administrator zmienia je w panelu `/admin`, zapis tworzy nową wersję z opisem zmiany i historią różnic, a kalkulator od razu liczy według nowych wartości. Można wrócić do domyślnych albo zaimportować zestaw parametrów z pliku.

**3. Jak jest z RODO i danymi z ZUS?**
W demo wszystkie osoby i PESEL-e są fikcyjne. Dane sprawy zostają w przeglądarce (sessionStorage) – serwer tylko liczy i niczego nie zapisuje. Numer rachunku z ZAM nie trafia do żadnego magazynu. Prawdziwe sprawy od ZUS trzymamy wyłącznie lokalnie, poza repozytorium i buildem. W wersji produkcyjnej dane pobierane byłyby za zgodą użytkownika po zalogowaniu (tak, jak w symulacji).

**4. Jak to połączyć z PUE/eZUS i mObywatelem?**
Mocki mają kształt docelowych usług: profil ubezpieczonego, e-ZLA, stan rozliczeń, wysyłka wniosku. Integracja to wymiana warstwy `src/server/mocks` na klienta API ZUS i logowanie przez węzeł krajowy – silnik i interfejs się nie zmieniają. Silnik może też działać jako usługa REST dla PUE lub mZUS.

**5. Czy obsługujecie adopcję i rodzinę zastępczą?**
Tak: urlop na warunkach macierzyńskiego z limitami wieku dziecka (w tym odroczony obowiązek szkolny), rodzicielski, ojcowski po przysposobieniu, osobny wzór wniosku i persona demonstracyjna Ewa i Piotr (adopcja 2-latka).

**6. Jak liczycie łączenie urlopu rodzicielskiego z pracą?**
Przy pracy do pół etatu urlop wydłuża się proporcjonalnie, a zasiłek jest pomniejszony o część etatu (podstawa × stawka × (1 − etat)) za cały wydłużony okres. W kalkulatorze wybiera się ¼ lub ½ etatu dla każdej części, a wniosek zawiera wymagane oświadczenia z § 16 rozporządzenia.

**7. Co, jeśli wynik różni się od decyzji ZUS?**
Przy sprawie z wynikiem ZUS pokazujemy różnicę pole po polu (prawo, podstawa, kwota). Runner `npm run cases` wypisuje różnice dla całego zestawu, więc po otrzymaniu zanonimizowanych spraw od ZUS szybko znajdziemy regułę do poprawy. Aplikacja zawsze zaznacza, że wynik jest informacyjny i nie zastępuje decyzji.

**8. Gdzie jest AI?**
W jednym miejscu, oznaczonym plakietką „AI”: odczyt wgranych PDF (ZAM, Z-3, Z-3a). Claude odczytuje dane do schematu, przy każdym polu podaje pewność i cytat z dokumentu, a użytkownik sprawdza i zatwierdza formularz. Wyliczeń AI nie robi – liczy silnik regułowy, żeby wynik był powtarzalny i zgodny z decyzją co do grosza. Pliki nie są przechowywane. Przy tworzeniu kodu pomagał nam Claude jako asystent programisty.

**9. Czy to się skaluje?**
Silnik to czyste funkcje bez stanu, a API jest bezstanowe (sesje w ciasteczkach, wysyłka wniosków bez zapisu po stronie serwera). Można je skalować poziomo na dowolnej platformie; parametry trzymamy w Redis (Upstash) albo w pliku. Na Vercelu działa bez dodatkowej infrastruktury.

**10. Co z dostępnością i telefonem?**
Każdy ekran jest responsywny – testy E2E sprawdzają brak poziomego przewijania na 13 stronach na iPhonie 13 i desktopie. Komponenty Radix/shadcn mają obsługę klawiatury i czytników ekranu, wyniki ogłaszane są przez `aria-live`, a dokumenty można wydrukować lub zapisać jako PDF.

## Próby (zespół)

- [ ] Próba 1 – z zegarem, sam tekst (cel: 2:50–3:00)
- [ ] Próba 2 – z demo na żywo (`/demo/anna`, kalkulator, panel admina)
- [ ] Próba 3 – z pytaniami z listy powyżej
