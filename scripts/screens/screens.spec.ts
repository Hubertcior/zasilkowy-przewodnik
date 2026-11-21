import { expect, test, type Page } from "@playwright/test";

// Generates docs/screens/<name>-<project>.jpg. Waits for client data so the screenshots show real results.

async function shot(page: Page, name: string, project: string) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: `docs/screens/${name}-${project}.jpg`, type: "jpeg", quality: 80 });
}

async function demo(page: Page, persona: string, target: string) {
  await page.goto(`/demo/${persona}?do=${target}`);
  await page.waitForURL(`**/${target.split("&")[0]}**`);
  await page.waitForLoadState("networkidle");
}

test("zrzuty ekranu", async ({ page }, info) => {
  test.setTimeout(180_000);
  const p = info.project.name;

  await page.goto("/");
  await shot(page, "01-start", p);

  await page.goto("/logowanie");
  await expect(page.getByRole("button", { name: /Zaloguj jako Anna/ })).toBeVisible();
  await shot(page, "02-logowanie", p);

  await demo(page, "anna", "moja-sytuacja");
  await expect(page.getByText("Jesteś ubezpieczona chorobowo").filter({ visible: true }).first()).toBeVisible();
  await shot(page, "03-moja-sytuacja", p);

  await demo(page, "kasia", "kalkulator");
  await expect(page.getByText("Oś czasu urlopów")).toBeVisible();
  if (p === "mobile") await page.getByText("Oś czasu urlopów").scrollIntoViewIfNeeded();
  await shot(page, "04-kalkulator", p);

  await demo(page, "anna", "co-i-gdzie");
  await shot(page, "05-co-i-gdzie", p);

  await page.goto("/wnioski?formularz=macierzynski-przed-porodem");
  await page.locator("#f-place").fill("Warszawa");
  await page.getByRole("button", { name: "Dalej" }).click();
  await page.getByRole("button", { name: "Podgląd wniosku" }).click();
  await expect(page.getByLabel("Podgląd wniosku – symulacja")).toBeVisible();
  await page.getByLabel("Podgląd wniosku – symulacja").scrollIntoViewIfNeeded();
  await shot(page, "06-wniosek", p);

  await demo(page, "anna", "konto&tab=ezla");
  await expect(page.getByText("B = ciąża, 100% zasiłku")).toBeVisible();
  await shot(page, "07-konto-pue", p);

  await page.goto("/trudne-sytuacje#wczesniak");
  await expect(page.getByText(/najwyżej/).first()).toBeVisible();
  await shot(page, "08-trudne-sytuacje", p);

  await page.goto("/sprawy");
  await expect(page.getByRole("button", { name: "Sprawdź tę sprawę" }).first()).toBeVisible();
  await shot(page, "09-sprawy", p);

  await page.goto("/admin");
  await page.waitForURL("**/admin/login**");
  await page.waitForLoadState("networkidle");
  await page.locator("#pw").fill("demo-zus");
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('[id="f-rates.longApplication"]')).toBeVisible();
  await shot(page, "10-admin", p);
});
