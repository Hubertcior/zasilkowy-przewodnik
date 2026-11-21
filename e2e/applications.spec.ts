import { expect, test } from "@playwright/test";
import { loginPersona } from "./helpers";

test("wnioski: wniosek o urlop wypełniony z planu → podgląd → wysyłka (symulacja) → numer sprawy", async ({ page }) => {
  await loginPersona(page, "Anna");
  await page.goto("/wnioski?formularz=macierzynski-przed-porodem");
  await expect(page.locator("#f-name")).toHaveValue("Anna Kowalczyk");
  await page.locator("#f-place").fill("Warszawa");
  await page.getByRole("button", { name: "Dalej" }).click();
  await page.getByRole("button", { name: "Podgląd wniosku" }).click();
  await expect(page.getByLabel("Podgląd wniosku – symulacja")).toContainText("SYMULACJA");
  await page.getByRole("button", { name: /Wyślij do pracodawcy/ }).click();
  await expect(page.getByText(/SYM-MAC\/\d{4}\/\d{6}/)).toBeVisible();
  await expect(page.getByText("przyjęty")).toBeVisible({ timeout: 10_000 });
});
