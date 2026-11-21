import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test("przykładowa sprawa: wybór → zgodność z wynikiem ZUS", async ({ page }) => {
  await page.goto("/sprawy");
  const card = page.locator("[data-slot=card]").filter({ hasText: "z wynikiem ZUS" }).first();
  await card.getByRole("button", { name: "Sprawdź tę sprawę" }).click();
  await page.waitForURL("**/moja-sytuacja");
  await expect(page.getByText("Zgodne").filter({ visible: true }).first()).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("przykładowa sprawa: upload pliku JSON", async ({ page }) => {
  await page.goto("/sprawy");
  const file = path.join(process.cwd(), "src/fixtures/cases/etat-duzy-pracodawca.json");
  await page.locator('input[type="file"]').setInputFiles({ name: "sprawa.json", mimeType: "application/json", buffer: readFileSync(file) });
  await page.waitForURL("**/moja-sytuacja");
  await expect(page.getByText("Zgodne").filter({ visible: true }).first()).toBeVisible();
});

test("przykładowa sprawa: niepoprawny plik → komunikat błędu", async ({ page }) => {
  await page.goto("/sprawy");
  await page.locator('input[type="file"]').setInputFiles({ name: "zly.json", mimeType: "application/json", buffer: Buffer.from('{"id":"x"}') });
  await expect(page.getByText("Plik nie jest poprawną sprawą")).toBeVisible();
});
