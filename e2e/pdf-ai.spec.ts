import { expect, test } from "@playwright/test";

// [AI] KAN-36 – the model call is mocked by intercepting /api/cases/extract (no API key, no cost in tests).

const f = <T>(value: T | null, confidence = "wysoka", sourceQuote: string | null = "cytat z dokumentu") => ({ value, confidence, sourceQuote });
const extraction = {
  documents: [{ kind: "Z-3", description: "Zaświadczenie płatnika" }],
  applicantRole: f("matka"),
  applicantName: f("Testowa Osoba"),
  insuranceTitle: f("umowa_o_prace"),
  sickness: f("obowiazkowe"),
  insuredFrom: f("2019-03-01"),
  payerName: f("Firma Testowa"),
  payerInsuredCount: f(120),
  incomes: Array.from({ length: 12 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, "0")}`, gross: 7000, confidence: "wysoka", sourceQuote: "7 000,00" })),
  declaredBase: f(null, "niska", null),
  scenario: f("urodzenie"),
  eventDate: f(null, "niska", null), // missing → must be filled in by the user
  children: f(1),
  zaZyciem: f(false),
  longApplication: f(true),
  gestationWeek: f(null, "niska", null),
  birthWeightG: f(null, "niska", null),
  hospitalWeeks: f(null, "niska", null),
  notes: ["Brak daty porodu w dokumentach."],
};

test("bez klucza API: przycisk „Wgraj PDF” prowadzi do formularza ręcznego", async ({ page }) => {
  await page.route("**/api/cases/extract", (r) => r.fulfill({ json: { enabled: false } }));
  await page.goto("/sprawy");
  await page.getByRole("button", { name: /Wgraj PDF/ }).click();
  await expect(page.getByText(/nie jest włączony na tym serwerze/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Przejdź do formularza" })).toBeVisible();
});

test("z kluczem: PDF → weryfikacja (niepewne pola) → wyliczenie", async ({ page }) => {
  await page.route("**/api/cases/extract", (r) =>
    r.request().method() === "GET" ? r.fulfill({ json: { enabled: true } }) : r.fulfill({ json: { ai: true, model: "claude-opus-5-5", extraction } }),
  );
  await page.goto("/sprawy");
  await page.getByRole("button", { name: /Wgraj PDF/ }).click();
  await expect(page.getByText("Plik jest wysyłany do modelu AI")).toBeVisible();
  await page.locator('input[type="file"][accept*="pdf"]').setInputFiles({ name: "z3.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 test") });
  await expect(page.getByText("Sprawdź odczytane dane")).toBeVisible();
  await expect(page.getByText("Brak daty porodu w dokumentach.")).toBeVisible();
  await expect(page.locator("#x-applicantName")).toHaveValue("Testowa Osoba");
  await page.getByRole("button", { name: "Zatwierdź i zobacz wyliczenie" }).click();
  await expect(page.getByText("Podaj datę porodu / przyjęcia dziecka")).toBeVisible();
  await page.locator("#x-eventDate").fill("2026-11-10");
  await page.getByRole("button", { name: "Zatwierdź i zobacz wyliczenie" }).click();
  await page.waitForURL("**/moja-sytuacja");
  await expect(page.getByText("Jesteś ubezpieczona chorobowo").filter({ visible: true }).first()).toBeVisible();
});
