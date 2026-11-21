# Zasiłkowy Przewodnik Przyszłego Rodzica

Aplikacja webowa (RWD) przygotowana na HackNation 2026 (zadanie ZUS), która indywidualnie ustala uprawnienia i wylicza zasiłki z ubezpieczenia chorobowego dla przyszłych rodziców — zasiłek chorobowy w okresie ciąży oraz zasiłek macierzyński we wszystkich wariantach — prowadzi przez składanie wniosków i symuluje integracje z mObywatelem, danymi ZUS, PUE i e-ZLA. Stos: Next.js (UI + REST API), TypeScript, Tailwind CSS, shadcn/ui.

## Uruchomienie

```bash
npm i
npm run dev      # http://localhost:3000
npm test         # testy (vitest)
npm run typecheck
npm run build
```

## Struktura

- `src/engine/` — czysta logika zasiłków (bez React/Next)
- `src/config/params.default.json` — domyślne parametry
- `src/server/` — magazyn parametrów i mocki integracji
- `src/app/api/` — REST API
- `src/components/` — komponenty UI (shadcn/ui w `ui/`)
- `src/fixtures/cases/` — syntetyczne przykładowe sprawy
- `docs/` — dokumentacja

> Oryginalne zestawy spraw od ZUS nie mogą być kopiowane ani publikowane — trzymaj je lokalnie w `cases-private/` (ignorowane przez git).

## Deploy (Vercel)

1. Zaloguj się na [vercel.com](https://vercel.com) i wybierz **Add New → Project**.
2. Zaimportuj repozytorium `zasilkowy-przewodnik` z GitHuba.
3. Framework zostanie wykryty automatycznie (Next.js) — kliknij **Deploy**.
