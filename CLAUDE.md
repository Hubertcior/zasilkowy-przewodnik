@AGENTS.md

# Zasiłkowy Przewodnik Przyszłego Rodzica

## Produkt

Aplikacja webowa (RWD) na HackNation 2026, zadanie ZUS. Indywidualnie ustala uprawnienia i wylicza zasiłki z ubezpieczenia chorobowego dla przyszłych rodziców:

- zasiłek chorobowy w ciąży,
- zasiłek macierzyński we wszystkich wariantach (oboje rodzice, łączenie z pracą, wieloraczki, „Za życiem”, adopcja i piecza).

Prowadzi przez dokumenty i wnioski, ostrzega przed utratą uprawnień i symuluje integracje (mObywatel, dane z ZUS, PUE/eZUS, e-ZLA). Wszystkie kalkulatory to **jeden zintegrowany kalkulator z opcjami**. Jury sprawdza poprawność wyliczeń na przykładowych sprawach.

Pełne wymagania: [docs/wymagania.md](docs/wymagania.md).

## Architektura

```
src/engine      czyste funkcje (bez React/Next); parametry przekazywane jako argument
   ↓
src/app/api     REST API (route handlers), walidacja wejścia zod
   ↓
src/app         UI (App Router), komponenty w src/components (shadcn/ui w ui/)
```

- `src/engine/types.ts`: typy domenowe (rozszerzaj w kolejnych zadaniach).
- `src/config/params.default.json`: domyślne parametry zasiłków. W runtime udostępnia je `ParamsStore` w `src/server` (KAN-13).
- `src/server/mocks`: mocki integracji (mObywatel, ZUS, PUE, e-ZLA); endpointy w `src/app/api/mock`.
- `src/engine/schemas.ts` + `src/engine/calculate.ts`: walidacja wejścia API i orkiestracja całego wyliczenia. Opis API: [docs/api.md](docs/api.md).
- Postęp i uwagi do weryfikacji: [docs/POSTEP.md](docs/POSTEP.md).
- `src/fixtures/cases`: syntetyczne przykładowe sprawy (`CaseFile`).
- Testy: vitest, `src/**/*.test.ts`. Logika silnika w `src/engine/__tests__`.

## Źródła prawne

**Nie zgaduj przepisów.** Jeśli masz dostęp do projektu claude.ai „HACKATLON 2026” (narzędzie Projects), korzystaj z jego plików:

- treść zadania ZUS,
- załącznik z wymiarami i stawkami,
- Poradnik dla rodziców ZUS 2026,
- wyciąg z ustawy zasiłkowej,
- wyciąg z Kodeksu pracy,
- rozporządzenie o wnioskach dotyczących rodzicielstwa (Dz.U. 2025 poz. 322),
- rozporządzenie o dokumentach do zasiłków (Dz.U. 2026 poz. 1316).

W przeciwnym razie korzystaj z https://www.zus.pl i https://isap.sejm.gov.pl.

**Przy każdej regule podawaj źródło**: w komentarzu w kodzie i w polu `source` ostrzeżeń, np. „art. 29 ust. 1 ustawy zasiłkowej”.

## Dane wrażliwe

- Zestawy spraw od ZUS trzymaj **tylko lokalnie** w `cases-private/` (jest w `.gitignore`). Nigdy ich nie kopiuj ani nie publikuj.
- W repo wyłącznie dane syntetyczne (`synthetic: true`). PESEL-e są fikcyjne.

## Symulacje

- Każdy ekran lub dokument symulowany ma widoczny znak **„SYMULACJA”**.
- Nie kopiujemy logotypów ani wyglądu mObywatela, PUE/eZUS i innych systemów.

## AI

Każda funkcja używająca AI ma w UI plakietkę **„AI”** i wpis w `docs/opis-projektu.md`.

## Konwencje

- UI po polsku, kod (nazwy, komentarze techniczne) po angielsku. Polskie terminy domenowe w typach są dozwolone (np. `macierzynski`).
- Daty w formacie ISO (`YYYY-MM-DD`, miesiące `YYYY-MM`). Operacje na datach przez `date-fns`.
- Kwoty zaokrąglane do groszy funkcją `round2`.
- Zasiłek za dzień = 1/30 kwoty miesięcznej.
- Każda reguła logiki ma testy.
- RWD: każdy ekran działa na desktopie i na mobile.
- Bez zbędnych zależności.

## Komendy

```bash
npm run dev        # http://localhost:3000
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run lint
npm run build
```

Node jest zainstalowany przez nvm. W nieinteraktywnej powłoce najpierw `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"`.

## Workflow zadania

1. Przeczytaj zadanie KAN-xx w Jirze (site hacknation-thebuggers.atlassian.net, projekt KAN).
2. Przeczytaj CLAUDE.md i docs/wymagania.md.
3. Zaimplementuj.
4. `npm test`, `npm run typecheck` i `npm run build` muszą przejść.
5. Zrób commit `KAN-xx: <opis>` i push na `main`.
6. Dodaj w Jirze komentarz z podsumowaniem i założeniami, a zadanie przenieś do Done.

Gdy brakuje informacji, wybierz rozsądny wariant, opisz go w komentarzu i nie blokuj się.
