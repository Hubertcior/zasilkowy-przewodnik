import { expect, test } from "@playwright/test";

// Walks the video script (docs/film-skrypt.md) so the labels quoted there stay in sync with the app.
test("ścieżka filmu: etykiety ze skryptu istnieją", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "skrypt nagrywany na desktopie");
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await page.getByRole("link", { name: /Zaloguj się przez mObywatel/ }).click();
  await page.getByRole("button", { name: "Zaloguj jako Anna" }).click();
  await page.getByRole("button", { name: "Wyrażam zgodę – pobierz dane" }).click();
  await page.waitForURL("**/moja-sytuacja");
  await expect(page.getByText("Jesteś ubezpieczona chorobowo").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Kto wypłaca zasiłek").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Jak to policzyliśmy – krok po kroku").filter({ visible: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Zaplanuj w kalkulatorze" }).click();
  await expect(page.getByText("81,5% za całość czy 100% + 70%?")).toBeVisible();
  await expect(page.getByText("Wniosek o cały urlop (81,5%)", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Liczba dzieci").fill("2");
  await page.getByText("Zaświadczenie „Za życiem”").click();
  await expect(page.getByText(/Urlop rodzicielski \(67 tyg\./)).toBeVisible();
  await page.getByLabel("Praca").first().selectOption({ label: "½ etatu" });

  await page.goto("/sprawy");
  await page.locator("[data-slot=card]").filter({ hasText: "Bliźnięta z zaświadczeniem „Za życiem”" }).getByRole("button", { name: "Sprawdź tę sprawę" }).click();
  await expect(page.getByText("Wynik ZUS w sprawie a nasze wyliczenie")).toBeVisible();
  await expect(page.getByText("Zgodne").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Wgraj sprawę (.json)" })).toHaveCount(0); // we are on /moja-sytuacja now

  await page.goto("/demo/anna?do=co-i-gdzie");
  await page.waitForURL("**/co-i-gdzie");
  await page.getByRole("link", { name: "Wypełnij wniosek" }).first().click();
  await page.locator("[data-slot=card]").filter({ hasText: "Macierzyński przed porodem" }).getByRole("button", { name: "Wypełnij" }).click();
  await page.getByLabel(/Miejscowość/).fill("Warszawa");
  await page.getByRole("button", { name: "Dalej" }).click();
  await page.getByRole("button", { name: "Podgląd wniosku" }).click();
  await page.getByRole("button", { name: /Wyślij do pracodawcy/ }).click();
  await expect(page.getByText("przyjęty")).toBeVisible({ timeout: 10_000 });

  await page.goto("/");
  await page.getByRole("link", { name: "Panel administracyjny" }).click();
  await page.waitForURL("**/admin/login**");
  await page.waitForLoadState("networkidle");
  await page.locator("#pw").fill("demo-zus");
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page.getByRole("tab", { name: "Stawki" })).toBeVisible();
  await expect(page.getByLabel("Wniosek o cały urlop")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zapisz parametry" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Domyślne" })).toBeVisible();
});
