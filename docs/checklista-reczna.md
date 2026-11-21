# Checklista ręczna przed demo i nagraniem filmu

Testy automatyczne (`npm test`, `npm run cases`, `npm run e2e`) sprawdzają logikę i główne ścieżki. Tej listy nie da się zautomatyzować – przejdź ją na prawdziwych urządzeniach. Przy każdym punkcie wpisz ✅/❌, urządzenie i uwagi.

## 1. Produkcja (Vercel)

- [ ] Strona otwiera się pod adresem produkcyjnym (HTTPS), bez błędów w konsoli przeglądarki.
- [ ] `/api/params` zwraca parametry; w stopce widać wersję parametrów.
- [ ] Ustawione zmienne: `ADMIN_PASSWORD` (inne niż `demo-zus`), opcjonalnie `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN` (trwałość zmian w panelu admina). Bez Upstash zmiany parametrów znikają po restarcie instancji – panel to pokazuje.
- [ ] Logowanie do `/admin` hasłem z `ADMIN_PASSWORD`, zmiana stawki, kalkulator pokazuje nową kwotę, „Domyślne” przywraca wartości.
- [ ] Linki demo działają: `/demo/anna`, `/demo/kasia`, `/demo/ola`, `/demo/marta`, `/demo/ewa-piotr`, `/demo/magda`, także z `?do=kalkulator|co-i-gdzie|wnioski|konto`.

## 2. Telefon – Android (Chrome) i iOS (Safari)

Dla każdego telefonu:

- [ ] Strona startowa: trzy ścieżki wejścia czytelne, przyciski łatwe do trafienia palcem.
- [ ] Logowanie (symulacja mObywatela) → „Moja sytuacja”: zakładki Mama/Tata działają, tekst nie wychodzi poza ekran.
- [ ] Kalkulator: zwijanie „Opcje kalkulatora”, zmiana liczby dzieci, przełącznik 81,5%, dodanie części rodzicielskiego. Oś czasu przewija się poziomo, reszta strony nie.
- [ ] Kreator ręczny: pola daty otwierają natywny kalendarz, klawiatura numeryczna przy kwotach.
- [ ] Wnioski: wypełnienie wniosku, podgląd, „Wyślij” – statusy zmieniają się po kilku sekundach.
- [ ] Konto PUE (symulacja): zakładki przewijają się poziomo, zaświadczenie o zadłużeniu czytelne.
- [ ] Trudne sytuacje: sekcje rozwijają się, linki do organizacji otwierają się w nowej karcie.
- [ ] Dolna nawigacja nie zasłania przycisków na dole strony (także na iPhonie z paskiem gestów).
- [ ] Orientacja pozioma nie psuje układu.
- [ ] Tryb ciemny systemu: tekst czytelny, dokumenty do druku zostają białe.

## 3. Czytelność i dostępność

- [ ] Powiększenie tekstu w systemie (150–200%): nic się nie nakłada.
- [ ] Nawigacja klawiaturą (Tab) na desktopie: widoczny fokus, „Przejdź do treści” działa.
- [ ] Czytnik ekranu (VoiceOver/TalkBack) odczytuje kwoty i ostrzeżenia sensownie.
- [ ] Teksty są po polsku, bez literówek w kluczowych miejscach (kwoty, terminy, nazwy urlopów).
- [ ] Znak „SYMULACJA” widoczny na: logowaniu, „Moim koncie”, wnioskach, podglądach dokumentów, wysyłce.

## 4. Druk

- [ ] Kalkulator → „Drukuj / PDF”: menu i nawigacja ukryte, tabela okresów mieści się na stronie.
- [ ] Wniosek (np. urlop rodzicielski i ZAM) → „Drukuj”: widoczny znak wodny „SYMULACJA – wzór niewiążący”, załączniki, miejsce na podpis.
- [ ] Zaświadczenie o zadłużeniu → „Drukuj podgląd”: znak wodny widoczny na wydruku.
- [ ] Numer rachunku z ZAM nie pojawia się w całości na podglądzie (tylko 4 ostatnie cyfry).

## 5. Poprawność na sprawach

- [ ] `/sprawy`: każda sprawa z wynikiem ZUS pokazuje „Zgodne”.
- [ ] Jeśli zespół ma sprawy od ZUS: wrzuć je do `cases-private/` (tylko lokalnie!) i uruchom `npm run cases`. Różnice opisz w Jirze bez danych osobowych.
- [ ] Martwe urodzenie (`/kalkulator?sytuacja=martwe-urodzenie`): 8 tygodni po 100%, bez urlopu ojcowskiego.
