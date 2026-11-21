# Wymagania ZUS: Zasiłkowy Przewodnik Przyszłego Rodzica

Wymagania przepisane z treści zadania ZUS na HackNation 2026. Dokument jest źródłem prawdy o zakresie produktu. Przy wątpliwościach co do przepisów sięgaj do źródeł prawnych wymienionych w [CLAUDE.md](../CLAUDE.md).

## Cel

Narzędzie dla osób planujących rodzicielstwo, kobiet w ciąży i rodziców. Ma:

- dawać kompleksowe informacje o uprawnieniach z ubezpieczeń społecznych,
- prowadzić przez wnioski,
- wspierać decyzje o urlopach, powrocie do pracy i podziale opieki,
- pomagać w sytuacjach trudnych.

Uprawnienia są ustalane **indywidualnie**, na podstawie danych z ZUS albo danych wpisanych przez użytkownika.

## Funkcje

| Id | Funkcja |
|----|---------|
| a | Informacje o świadczeniach w ciąży, **także o ich braku**: zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego. |
| b | Kalkulator zasiłku macierzyńskiego dla obojga rodziców (okres i wysokość) z uwzględnieniem liczby dzieci, ich wieku i zaświadczenia „Za życiem”. |
| c | Kalkulator przy łączeniu pracy z urlopem rodzicielskim. |
| d | Symulacja, gdy z uprawnień korzystają oboje rodzice. |
| e, j | Kalkulator dla rodziców adopcyjnych i rodziny zastępczej niezawodowej. |
| f | Kalkulator z indywidualną podstawą wymiaru dla konkretnej sprawy z zestawów ZUS. |
| g | Dokumenty, terminy, sposób złożenia; kto wypłaca (płatnik albo ZUS) i gdzie złożyć. |
| h | Zagrożenia: utrata uprawnień, zmiana wymiaru lub wysokości. |
| i | Organizacje **wyłącznie charytatywne** na sytuacje szczególne (śmierć dziecka, wcześniak, poronienie, ciężko chore dziecko). |

**Rekomendacja ZUS:** wszystkie kalkulatory jako **jeden zintegrowany kalkulator z opcjami**.

## Symulacje

- Logowanie przez mObywatel.
- Pobranie danych z ZUS (ubezpieczenie lub jego brak) albo ręczne wprowadzenie danych.
- Zadłużenie składkowe na dzień powstania prawa do zasiłku (ważne dla JDG).
- Podgląd e-ZLA.
- Połączenie z PUE/eZUS: zadanie pytania, dane konta.
- Wypełnienie i wysłanie wniosków:
  - o urlopy (wzory trzeba zaprojektować),
  - o świadczenia (wzory na zus.pl).
- Wniosek o odpis aktu urodzenia (gov.pl, rejestr stanu cywilnego).
- Informacje o fundacjach.
- Przekierowania do:
  - https://www.zus.pl
  - https://www.gov.pl/web/rodzina/urlop-rodzicielski
  - https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo

## Panel administracyjny

Zmiana parametrów (stawki, wymiary) przy zmianach przepisów.

## Wymagania formalne

- Szczegółowy opis i tytuł projektu.
- Prezentacja: maksymalnie 10 slajdów.
- Film: maksymalnie 3 minuty, w otwartym repozytorium (link).
- Repozytorium kodu.
- Zrzuty ekranu.
- Demo online z możliwością przetestowania przykładowych spraw (czy osoba ma ubezpieczenie, kalkulator).
- Pełna responsywność.
- Wskazanie funkcji opartych na AI.
- Wskazanie rozwiązań zewnętrznych (zgodnie z regulaminem).

## Wymagania techniczne

- RWD.
- Potencjał produkcyjny.
- Preferowane React/Next.js oraz backend w JS, Pythonie lub C#; integracja przez REST API.
- Jury przetestuje demo, przejrzy kod i **sprawdzi poprawność wyliczeń na przykładowych wnioskach**. Strona musi pozwalać na **upload lub wybór wniosków**.

## Ocena

| Kryterium | Waga |
|-----------|------|
| Związek z wyzwaniem | 25% |
| Pomysł | 20% |
| Oryginalność | 15% |
| Kompletność i UX | 25% |
| Potencjał wdrożeniowy | 15% |
