import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test("kalkulator: bliźnięta + „Za życiem” → 67 tygodni rodzicielskiego", async ({ page }) => {
  await page.goto("/kalkulator");
  await page.locator("#ch").fill("2");
  await page.locator("#zz").click();
  await expect(page.getByText(/Urlop rodzicielski \(67 tyg\./)).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("kalkulator: łączenie z pracą (½ etatu) wydłuża okres rodzicielskiego", async ({ page }) => {
  await page.goto("/kalkulator");
  const row = page.getByRole("row").filter({ hasText: "Rodzicielski" }).filter({ hasText: "Mama" }).first();
  await expect(row).toBeVisible();
  const daysBefore = Number((await row.getByRole("cell").nth(3).innerText()).trim());
  await page.locator("#pf-0").selectOption("0.5");
  await expect(async () => {
    const daysAfter = Number((await page.getByRole("row").filter({ hasText: "Rodzicielski" }).filter({ hasText: "Mama" }).first().getByRole("cell").nth(3).innerText()).trim());
    expect(daysAfter).toBe(daysBefore * 2);
  }).toPass();
});

test("kalkulator: preset martwego urodzenia → 8 tygodni po 100%", async ({ page }) => {
  await page.goto("/kalkulator?sytuacja=martwe-urodzenie");
  const row = page.getByRole("row").filter({ hasText: "Macierzyński" }).first();
  await expect(row).toContainText("56");
  await expect(row).toContainText("100%");
  await expect(page.getByRole("row").filter({ hasText: "Ojcowski" })).toHaveCount(0);
});
