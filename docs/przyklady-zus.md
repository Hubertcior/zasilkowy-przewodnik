# Przykładowe sprawy ZUS: jak je przepisać i przetestować

> ⚠️ **Oryginalnych zestawów spraw od ZUS nie wolno kopiować, publikować ani commitować.**
> Przepisane sprawy trzymaj wyłącznie lokalnie w `cases-private/` (katalog jest w `.gitignore`).

## Gdzie co leży

| Miejsce | Co | W repo? |
|---------|----|---------|
| `src/fixtures/cases/*.json` | syntetyczne sprawy demo (`"synthetic": true`), wyliczone ręcznie | tak |
| `cases-private/*.json` (lub katalog z `CASES_DIR`) | sprawy przepisane z zestawów ZUS | **nie** |

Aplikacja wczytuje oba źródła. Sprawy prywatne są w UI oznaczone jako „Sprawa testowa ZUS (lokalnie)” i widać je tylko na komputerze, który ma ten katalog.

## Format pliku (`CaseFile`)

Schemat: `CaseFileSchema` w `src/engine/schemas.ts`, typy w `src/engine/types.ts`. Przykłady: `src/fixtures/cases/`.

```jsonc
{
  "id": "zus-01",                       // małe litery, cyfry, myślniki
  "title": "Sprawa 1 – etat, poród",
  "description": "Krótki opis bez danych osobowych",
  "synthetic": false,                   // false = przepisana sprawa ZUS
  "parents": [{
    "role": "matka",
    "age": 31,
    "periods": [                         // okresy ubezpieczenia (Z-3 / Z-3a / dane z ZUS)
      { "title": "umowa_o_prace", "sickness": "obowiazkowe", "from": "2021-02-01",
        "payerInsuredCount": 35,         // ilu ubezpieczonych zgłasza płatnik (>20 → płatnik wypłaca)
        "workTimeFraction": 1 }          // etat
    ],
    "incomes": [                         // Z-3 pkt „wynagrodzenie”: 12 miesięcy przed miesiącem powstania prawa
      { "month": "2025-03", "gross": 7000 },
      { "month": "2025-04", "gross": 5200, "daysWorked": 15, "workingDays": 21,   // miesiąc niepełny
        "fixed": 7000, "variable": 0 },
      { "month": "2025-05", "gross": 2000, "workedHalfOrMore": false }             // < połowy – wyłączony
    ],
    "bonuses": [{ "kind": "kwartalna", "amount": 1500, "period": "2025-Q4" }],    // Z-3 pkt o premiach
    "contractSalary": 7000,              // wynagrodzenie z umowy (1. miesiąc pracy)
    "declaredBase": [{ "month": "2025-03", "amount": 5000 }],                     // JDG: podstawa składek
    "contributionDebt": 0
  }],
  "scenario": { "kind": "urodzenie", "birthDate": "2026-03-10", "children": 1, "zaZyciem": false },
  "plan": {                              // z wniosku ZAM / wniosków o urlopy
    "longApplication": true,
    "parental": [{ "parent": "matka", "weeks": 32 }]
  },
  "expected": {                          // decyzja ZUS w sprawie
    "granted": true,
    "base": 6040.30,                     // podstawa wymiaru z decyzji
    "monthly": 4922.84,                  // miesięczna kwota zasiłku (pierwszy okres matki)
    "notes": "Skąd wzięły się te liczby"
  }
}
```

### Skąd brać dane

| Dokument | Pola |
|----------|------|
| **Z-3** (pracownik) | `periods` (od kiedy, etat, liczba ubezpieczonych u płatnika), `incomes` (wynagrodzenia z 12 miesięcy, dni przepracowane, składniki stałe/zmienne, pomijane → `excluded`), `bonuses`, `contractSalary` |
| **Z-3a** (zleceniobiorca) | `periods` (`zlecenie`, `dobrowolne`), `incomes` (przychód stanowiący podstawę składek) |
| **ZAM** | `scenario` (data porodu, liczba dzieci), `plan.longApplication` (wniosek do 21 dni po porodzie), części urlopu |
| Zaświadczenia | `zaZyciem`, `prematurity` (tydzień ciąży, masa, tygodnie w szpitalu), `stillbirth`, `childDeath`, dokumenty adopcji (`acceptDate`, `childAges`) |
| Decyzja ZUS | `expected` |

### Anonimizacja (obowiązkowo)

- **Bez** imion, nazwisk, PESEL, adresów, nazw pracodawców, numerów dokumentów i kont.
- `payerName` pomiń albo wpisz fikcyjną nazwę.
- Daty i kwoty przepisz dokładnie, bo od nich zależy wynik.
- Nie skanuj ani nie wklejaj zrzutów dokumentów do repo.

## Jak uruchomić test

```bash
mkdir -p cases-private
# zapisz przepisane sprawy jako cases-private/zus-01.json, zus-02.json, …
npm run cases
```

Runner liczy każdą sprawę (syntetyczne i prywatne) silnikiem i drukuje tabelę:

```
sprawa       │ źródło         │ decyzja oczek./obl. │ podstawa oczek./obl. │ kwota oczek./obl. │ wynik
zus-01       │ ZUS (lokalnie) │ TAK / TAK           │ 6040,30 / 6040,30    │ 4922,84 / 4922,84 │ OK
```

Przy różnicy wypisuje szczegóły i kończy się kodem ≠ 0. Inny katalog wskażesz zmienną: `CASES_DIR=/ścieżka npm run cases`.

W aplikacji (`npm run dev` → `/sprawy`) sprawy prywatne są na liście. Można też wgrać pojedynczy plik przyciskiem „Wgraj sprawę (.json)”. Plik jest tylko walidowany i nie jest zapisywany na serwerze.

## Pytanie do mentorów ZUS

> Czy możemy umieścić **przepisane i zanonimizowane** dane spraw z zestawów (same liczby: okresy, wynagrodzenia, daty, decyzje, bez danych osobowych) w publicznym demo i repozytorium, żeby jury mogło je wybrać z listy? Czy mają pozostać tylko lokalnie, a w demo wyłącznie sprawy syntetyczne i upload?

Do czasu odpowiedzi: w repo i na demo są **wyłącznie sprawy syntetyczne**, a sprawy ZUS testujemy lokalnie.
