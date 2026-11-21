import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, loginPersona } from "./helpers";

test("mObywatel: Anna → moja sytuacja → kalkulator (81,5%) → co i gdzie złożyć", async ({ page }) => {
  await loginPersona(page, "Anna");
  await expect(page.getByText("Jesteś ubezpieczona chorobowo").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/wypłaca płatnik/i).filter({ visible: true }).first()).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.goto("/kalkulator");
  // Mother's maternity leave at 81.5% of the base 6040,30 zł.
  await expect(page.getByRole("cell", { name: /4922,84/ }).filter({ visible: true }).first()).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.goto("/co-i-gdzie");
  await expect(page.getByRole("heading", { name: /Co i gdzie złożyć/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Złóż online/ }).first()).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("PUE (symulacja): e-ZLA z kodem B i zaświadczenie o zadłużeniu", async ({ page }) => {
  await loginPersona(page, "Anna");
  await page.goto("/konto?tab=ezla");
  await expect(page.getByText("B = ciąża, 100% zasiłku")).toBeVisible();
  await page.getByRole("button", { name: "Przelicz chorobowy w ciąży" }).click();
  await expect(page.getByText("Świadczenia za zwolnienia z kodem B")).toBeVisible();
  await page.goto("/konto?tab=zadluzenie");
  await expect(page.getByText("nie stwierdzono zadłużenia")).toBeVisible();
  await expectNoHorizontalScroll(page);
});
