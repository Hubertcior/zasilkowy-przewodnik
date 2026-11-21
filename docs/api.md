# REST API

UI korzysta wyłącznie z tych endpointów: silnik (`src/engine`) działa po stronie serwera.
Wszystkie obliczenia pobierają aktualne parametry z `getParamsStore()` (panel admina).

## Format błędów

| Kod | Body |
|-----|------|
| 400 | `{ "error": "validation", "issues": [...] }` (issues z zod: `path`, `message`) |
| 401 | `{ "error": "..." }`: brak / zły `x-admin-key` |
| 404 | `{ "error": "not_found", "message": "..." }` |
| 500 | `{ "error": "..." }` |
| 501 | `{ "error": "not_implemented", "message": "...", "simulation": true }`: symulacja jeszcze niezaimplementowana |

## Endpointy

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| POST | `/api/eligibility` | prawo do zasiłku, kto wypłaca, dokumenty: dla każdego rodzica |
| POST | `/api/calculate` | pełne wyliczenie: podstawy (z krokami), prawo, wymiar, harmonogram z kwotami, ostrzeżenia |
| POST | `/api/pregnancy` | świadczenia w ciąży (wynagrodzenie chorobowe, zasiłek chorobowy, zasiłek w wys. macierzyńskiego) + ostrzeżenia |
| GET | `/api/cases` | lista przykładowych spraw |
| GET | `/api/cases/:id` | szczegóły sprawy (`CaseFile`) |
| GET | `/api/params` | aktualne parametry zasiłków |
| PUT | `/api/params` | zapis parametrów (nagłówek `x-admin-key`) |
| POST | `/api/params/reset` | przywrócenie domyślnych (admin) |
| GET | `/api/params/history` | historia zmian parametrów |
| POST | `/api/mock/mobywatel/login` | SYMULACJA logowania mObywatel (KAN-21) |
| GET | `/api/mock/zus/profile` | SYMULACJA danych z ZUS (KAN-21) |
| GET | `/api/mock/zus/ezla` | SYMULACJA podglądu e-ZLA: `{ ezla: [{ series, from, to, code, doctor, status, recipient }] }` (KAN-29) |
| GET | `/api/mock/zus/zadluzenie?date=` | SYMULACJA zadłużenia składkowego na dzień: `{ date, asOf, amount, details[] }` (KAN-29) |
| GET | `/api/mock/pue/wiadomosc` | SYMULACJA „Zapytaj ZUS”: lista wątków `{ threads[] }` (KAN-29) |
| POST | `/api/mock/pue/wiadomosc` | SYMULACJA „Zapytaj ZUS”: `{ category: macierzynski\|chorobowy\|dokumenty, subject?, question }` → 201 `{ thread }`; odpowiedź szablonowa po ok. 3 s (KAN-29) |
| POST | `/api/mock/wnioski` | SYMULACJA wysyłki wniosków (KAN-30) |

Schematy wejścia: `src/engine/schemas.ts` (zod, zgodne z `src/engine/types.ts`).

## Typy wejściowe (skrót)

```ts
ParentData {
  role: "matka" | "ojciec"; age?: number;
  periods: { title: "umowa_o_prace"|"zlecenie"|"dzialalnosc"|"inne"; sickness: "obowiazkowe"|"dobrowolne"|"brak";
             from: "YYYY-MM-DD"; to?: string; payerName?: string; payerInsuredCount?: number; workTimeFraction?: number;
             terminationReason?: "upadlosc"|"likwidacja"|"smierc_pracodawcy"|"naruszenie_prawa_wyrok"|"inne" }[];
  incomes: { month: "YYYY-MM"; gross: number; workedHalfOrMore?; fixed?; variable?; excluded?; daysWorked?; workingDays? }[];
  bonuses?: { kind: "kwartalna"|"roczna"; amount: number; period: "YYYY-Qn"|"YYYY" }[];
  contractSalary?: number; declaredBase?: { month; amount }[]; contributionDebt?: number; sickDaysThisYear?: number;
}
Scenario =
  | { kind: "ciaza"; dueDate }
  | { kind: "urodzenie"; birthDate; children; zaZyciem; prematurity?; childDeath?: { date }; stillbirth? }
  | { kind: "adopcja"|"piecza"; acceptDate; children; childAges: number[]; postponedSchool? }
LeavePlan { longApplication: boolean; motherMaternityWeeks?; fatherTakesOverFromWeek?; specialTakeOver?;
            parental: { parent; weeks; workFraction? }[]; paternityWeeks?: 0|1|2; paternityStartWeek? }
```

## Przykłady

### POST /api/calculate

```bash
curl -s -X POST http://localhost:3000/api/calculate -H 'content-type: application/json' -d '{
  "parents": [{
    "role": "matka",
    "periods": [{ "title": "umowa_o_prace", "sickness": "obowiazkowe", "from": "2020-01-01", "payerInsuredCount": 5 }],
    "incomes": [{ "month": "2026-03", "gross": 7000 }, { "month": "2026-04", "gross": 7000 }, { "month": "2026-05", "gross": 7000 }]
  }],
  "scenario": { "kind": "urodzenie", "birthDate": "2026-06-10", "children": 1, "zaZyciem": false }
}'
```

Odpowiedź (skrót):

```json
{
  "bases": { "matka": { "base": 6040.3, "method": "employee_12m", "steps": ["Okres: 12 pełnych miesięcy…", "…"], "sources": ["art. 36 ust. 1 u.z.", "…"] } },
  "eligibility": { "matka": { "insuredOnDate": true, "maternityEligible": true, "payer": "ZUS", "forms": ["Wniosek o urlop macierzyński…", "Z-3"], "reasons": ["…"] } },
  "entitlement": { "maternityWeeks": 20, "parentalWeeks": 41, "nonTransferablePerParent": 9, "paternityWeeks": 2, "notes": ["…"] },
  "plan": { "longApplication": true, "parental": [{ "parent": "matka", "weeks": 32 }], "paternityWeeks": 0 },
  "schedule": {
    "periods": [
      { "type": "macierzynski", "parent": "matka", "from": "2026-06-10", "to": "2026-10-27", "days": 140, "rate": 0.815, "base": 6040.3, "monthlyAmount": 4922.84, "total": 22973.25, "payer": "ZUS" },
      { "type": "rodzicielski", "parent": "matka", "from": "2026-10-28", "to": "2027-06-09", "days": 224, "rate": 0.815, "monthlyAmount": 4922.84, "total": 36757.21, "payer": "ZUS" }
    ],
    "monthly": [{ "month": "2026-06", "matka": 3445.99, "ojciec": 0 }, "…"],
    "totals": { "matka": 59730.46, "ojciec": 0, "razem": 59730.46 },
    "comparison": { "longApplication": 59730.46, "separate": 59800.88, "difference": -70.42 },
    "validation": { "ok": true, "errors": [] },
    "notes": ["…"]
  },
  "warnings": [{ "id": "termin-21-dni", "severity": "info", "title": "…", "text": "…", "source": "…" }]
}
```

Bez `plan` używany jest plan domyślny: długi wniosek, matka bierze rodzicielski minus 9 tygodni ojca, ojciec (jeśli jest) 9 tygodni i 2 tygodnie ojcowskiego.
`baseOverride: { "matka": 6040.3 }` pomija wyliczanie podstawy.

### POST /api/eligibility

```bash
curl -s -X POST http://localhost:3000/api/eligibility -H 'content-type: application/json' -d '{
  "parents": [{ "role": "matka", "periods": [{ "title": "zlecenie", "sickness": "dobrowolne", "from": "2025-01-01" }], "incomes": [] }],
  "scenario": { "kind": "ciaza", "dueDate": "2027-01-10" },
  "onDate": "2026-11-21"
}'
# → { "matka": { "insuredOnDate": true, "sicknessEligibleFrom": "2025-04-01", "payer": "ZUS", "forms": ["e-ZLA (kod „B”…)", "Z-3a"], … } }
```

### POST /api/pregnancy

```bash
curl -s -X POST http://localhost:3000/api/pregnancy -H 'content-type: application/json' -d '{
  "parent": { "role": "matka", "age": 30,
    "periods": [{ "title": "umowa_o_prace", "sickness": "obowiazkowe", "from": "2020-01-01", "payerInsuredCount": 50 }],
    "incomes": [{ "month": "2026-05", "gross": 7000 }] },
  "illnessFrom": "2026-06-01", "illnessTo": "2026-07-30", "codeB": true, "dueDate": "2026-12-01"
}'
# → { "eligible": true, "periods": [{ "type": "wynagrodzenie_chorobowe", "days": 33, "payer": "pracodawca" }, { "type": "chorobowy_ciaza", "days": 27, "payer": "platnik" }],
#     "daysUsed": 60, "daysLeft": 210, "base": { "base": 6040.3, … }, "warnings": […] }
```

`base` jest opcjonalne: bez niego podstawa liczona jest `calcBase` na dzień `illnessFrom`.

### Błąd walidacji

```bash
curl -s -X POST http://localhost:3000/api/calculate -d '{}'
# 400 → { "error": "validation", "issues": [{ "path": ["parents"], "message": "…" }, …] }
```
