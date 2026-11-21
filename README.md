# Zasiłkowy Przewodnik Przyszłego Rodzica

Aplikacja webowa (RWD) przygotowana na HackNation 2026 (zadanie ZUS), która indywidualnie ustala uprawnienia i wylicza zasiłki z ubezpieczenia chorobowego dla przyszłych rodziców — zasiłek chorobowy w okresie ciąży oraz zasiłek macierzyński we wszystkich wariantach — prowadzi przez składanie wniosków i symuluje integracje z mObywatelem, danymi ZUS, PUE i e-ZLA. Stos: Next.js (UI + REST API), TypeScript, Tailwind CSS, shadcn/ui.

## Uruchomienie

```bash
npm i
npm run dev      # http://localhost:3000
npm test         # testy (vitest)
npm run typecheck
npm run build
npm run cases      # runner przykładowych spraw (fixtures + cases-private)
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

## Parametry zasiłków i panel admina

Stawki i wymiary są w `src/config/params.default.json`, nie w kodzie. W runtime udostępnia je `ParamsStore`:

- lokalnie: plik `data/params.json` (gitignore),
- na Vercelu: Upstash Redis, jeśli ustawisz `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN`; bez tego pamięć, a zmiany giną przy restarcie.

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/params` | aktualne parametry |
| PUT | `/api/params` | zapis (nagłówek `x-admin-key` albo sesja panelu; opcjonalnie `x-admin-author`, `x-change-note`) |
| POST | `/api/params/reset` | przywrócenie domyślnych (admin) |
| GET | `/api/params/history` | historia zmian |

Panel administracyjny: **`/admin`** (logowanie hasłem → sesja w ciasteczku httpOnly). Bez ustawionej zmiennej `ADMIN_PASSWORD` działa hasło demonstracyjne **`demo-zus`** – w produkcji ustaw własne (skopiuj `.env.example` do `.env.local`).

## Przykładowe sprawy

Syntetyczne sprawy demo są w `src/fixtures/cases`, a prywatne sprawy ZUS tylko lokalnie w `cases-private/`. Opis: [docs/przyklady-zus.md](docs/przyklady-zus.md). REST API: [docs/api.md](docs/api.md).

## Deploy (Vercel)

1. Zaloguj się na [vercel.com](https://vercel.com) i wybierz **Add New → Project**.
2. Zaimportuj repozytorium `zasilkowy-przewodnik` z GitHuba.
3. W **Environment Variables** ustaw `ADMIN_PASSWORD` (opcjonalnie zmienne Upstash).
4. Framework zostanie wykryty automatycznie (Next.js) — kliknij **Deploy**.
