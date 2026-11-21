# Postęp prac i przekazanie projektu

Dziennik dla osoby (lub agenta), która przejmuje projekt. Aktualizowany po każdym zadaniu z Jiry
(site hacknation-thebuggers.atlassian.net, projekt KAN). Szczegóły i założenia każdego zadania są w komentarzu w Jirze.

## Jak kontynuować

1. Przeczytaj `CLAUDE.md` i `docs/wymagania.md`.
2. Sprawdź listę zadań: `project = KAN AND statusCategory != Done ORDER BY Rank ASC`.
3. Weź pierwsze niezrobione zadanie, zrób je zgodnie z workflow z `CLAUDE.md`, dopisz wiersz poniżej.

## Zrobione

| Zadanie | Commit | Co | Uwagi do weryfikacji |
|---------|--------|----|----------------------|
| KAN-11 | 33061e9 | Setup Next.js 16 + TS + Tailwind 4 + shadcn/ui (radix-nova) + vitest | Projekt w podfolderze `zasilkowy-przewodnik/` (polskie znaki w nazwie folderu nadrzędnego). `form` z shadcn zastąpiony `field`. Deploy na Vercel nie zrobiony (instrukcja w README). |
| KAN-12 | 9f03653 | CLAUDE.md, docs/wymagania.md, `src/engine/types.ts` | — |
| KAN-13 | d21e521 | `params.default.json`, `ParamsSchema`, ParamsStore (file/memory/upstash), `/api/params` | `cacheComponents` włączone → GET-y używają `connection()`, nie `dynamic`. |
| KAN-14 | 8ea9fa7 | `calcBase()` – podstawa wymiaru (pracownik / nie-pracownik), `steps` po polsku | Numery artykułów w `BASE_SOURCES` podane z pamięci – zweryfikować z ustawą. |
| KAN-15 | 9b69743 | `checkEligibility()` – prawo do zasiłku, okres wyczekiwania, kto wypłaca, formularze i załączniki | Numery artykułów w `ELIGIBILITY_SOURCES` do weryfikacji. Nowy parametr `pregnancy.waitingMaxGapDays`. |
| KAN-16 | 2a5770e | `calcEntitlement()` – wymiar urlopów: macierzyński, rodzicielski, uzupełniający, ojcowski, adopcja/piecza, zgon dziecka | Skracanie urlopu przy dziecku blisko limitu wieku tylko opisane w notatce (brak daty urodzenia dziecka w typach). Termin rodzicielskiego przy adopcji szacunkowy. Artykuły KP w `ENTITLEMENT_SOURCES` do weryfikacji. |
| KAN-17 | 797dba3 | `buildSchedule()` – okresy z datami i kwotami dla obojga rodziców, 81,5% vs 100%+70%, przejęcie macierzyńskiego, łączenie z pracą, ojcowski, przepływ miesięczny, porównanie wariantów, walidacja | Części rodzicielskiego układane kolejno (bez równoczesnego korzystania). Łączenie z pracą: zasiłek × (1 − etat) za wydłużony okres – zweryfikować z art. 182¹ᵉ KP i ustawą. Uzupełniający zawsze 100%. |
| KAN-18 | bb739dc | `calcPregnancy()` – świadczenia w ciąży: wynagrodzenie chorobowe 33/14 dni, zasiłek 100% (kod B) / 80%, wyczekiwanie, 270 dni, zasiłek po ustaniu ubezpieczenia, zasiłek w wys. macierzyńskiego, info o świadczeniu rehabilitacyjnym | Nowe parametry: `pregnancy.afterInsuranceIllnessWithinDays`, `pregnancy.periodsMergeMaxGapDays`, `rehabilitation.*`. Stawki świadczenia rehabilitacyjnego i art. 7/30 u.z. do weryfikacji. Limit dni pracodawcy liczony bez przejścia na nowy rok. |
| KAN-19 | 55028fa | `collectWarnings()` – 12 reguł ostrzeżeń (pozorność umowy, podwyższona podstawa, brak ubezpieczenia w dniu porodu, brak dobrowolnego chorobowego, wyczekiwanie, zadłużenie, termin 21 dni, 9 tygodni ojca, ojcowski, ochrona KP, łączenie z pracą, zmiana zarobków) | Progi heurystyczne w `params.warnings`. Początek ciąży = termin − 40 tyg. Umowa terminowa kończąca się po 3. mies. ciąży traktowana jako przedłużona do porodu (brak rozróżnienia czas określony/próbna). |
| KAN-20 | 95dd2a1 | REST API: `/api/eligibility`, `/api/calculate`, `/api/pregnancy`, `/api/cases(/:id)`, szkielet mocków (501), schematy zod, `calculateAll()`/`calculatePregnancy()`, docs/api.md | Plan domyślny przy braku `plan`. `/api/cases` zwraca pustą listę do KAN-22. Mocki do wypełnienia w KAN-21/29/30. |
| KAN-21 | (ten commit) | 6 person (`src/server/mocks/personas.ts`, daty względem dziś), mocki mObywatel login/logout (cookie httpOnly), ZUS profile/e-ZLA/zadłużenie, `/api/mock/personas`, UI `/logowanie` (wybór persony → zgoda → store), store zustand (`src/store/caseStore.ts`, sessionStorage), `SimulationBadge`, `LogoutButton`, tymczasowe `/moja-sytuacja` | `/moja-sytuacja` to placeholder do KAN-25. Store do rozbudowy w KAN-24. Paczka `cn` w komponentach shadcn jest poprawna (oficjalna paczka shadcn). |
