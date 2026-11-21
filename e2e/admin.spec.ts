import { expect, test } from "@playwright/test";

// Safety net: always restore default parameters, even if the test fails midway.
test.afterEach(async ({ request }) => {
  await request.post("/api/params/reset", { headers: { "x-admin-key": process.env.ADMIN_PASSWORD ?? "demo-zus" } });
});

test("admin: logowanie → zmiana stawki → kalkulator pokazuje nową kwotę → reset", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/admin");
  await page.waitForURL("**/admin/login**");
  await page.waitForLoadState("networkidle"); // hydrated – otherwise the form would submit natively
  await page.locator("#pw").fill("demo-zus");
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const rate = page.locator('[id="f-rates.longApplication"]');
  await rate.fill("0.9");
  await page.getByRole("button", { name: "Zapisz parametry" }).click();
  await expect(page.getByText(/Zapisano wersję/)).toBeVisible();

  // 6040,30 × 0,9 = 5436,27
  await page.goto("/kalkulator");
  await expect(page.getByRole("cell", { name: /5436,27/ }).filter({ visible: true }).first()).toBeVisible();

  await page.goto("/admin");
  await page.getByRole("button", { name: "Domyślne" }).click();
  await expect(page.getByText("Przywrócono domyślne parametry")).toBeVisible();
  await page.goto("/kalkulator");
  await expect(page.getByRole("cell", { name: /4922,84/ }).filter({ visible: true }).first()).toBeVisible();
});
