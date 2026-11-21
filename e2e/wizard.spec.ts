import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test("kreator ręczny: JDG bez chorobowego → brak prawa z wyjaśnieniem", async ({ page }) => {
  await page.goto("/kreator");
  await page.waitForLoadState("networkidle"); // hydrated
  // Step 1: situation – "Planuję dziecko" needs no date.
  await page.getByRole("radio", { name: "Planuję dziecko" }).check();
  await page.getByRole("button", { name: "Dalej" }).click();
  // Step 2: mother – sole trader without sickness insurance.
  await page.getByRole("radio", { name: "Działalność gospodarcza" }).check();
  await page.getByRole("radio", { name: "Nie mam" }).check();
  await page.locator("#mother-from").fill("2022-05-01");
  await page.getByRole("button", { name: "Dalej" }).click();
  // Step 3: earnings – nothing required without sickness insurance.
  await page.getByRole("button", { name: "Dalej" }).click();
  // Step 4: father – skip.
  await page.getByRole("checkbox", { name: "Tata nie korzysta z urlopu / nie dotyczy" }).check();
  await page.getByRole("button", { name: "Dalej" }).click();
  await page.getByRole("button", { name: "Zapisz i zobacz moją sytuację" }).click();
  await page.waitForURL("**/moja-sytuacja");
  await expect(page.getByText("Brak ubezpieczenia chorobowego").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/dobrowoln/i).filter({ visible: true }).first()).toBeVisible();
  await expectNoHorizontalScroll(page);
});
