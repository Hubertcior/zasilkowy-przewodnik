import { test } from "@playwright/test";
import { expectNoHorizontalScroll, loginPersona } from "./helpers";

const PUBLIC = ["/", "/kreator", "/kalkulator", "/sprawy", "/trudne-sytuacje", "/przydatne-linki", "/o-projekcie", "/logowanie", "/admin/login"];
const WITH_DATA = ["/moja-sytuacja", "/kalkulator", "/co-i-gdzie", "/wnioski", "/konto"];

test("brak poziomego scrolla – strony publiczne", async ({ page }) => {
  for (const url of PUBLIC) {
    await page.goto(url);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500); // client data (calculation, params) rendered
    await test.step(url, () => expectNoHorizontalScroll(page));
  }
});

test("brak poziomego scrolla – strony z danymi (persona Kasia)", async ({ page }) => {
  await loginPersona(page, "Katarzyna");
  for (const url of WITH_DATA) {
    await page.goto(url);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500); // client data (calculation, params) rendered
    await test.step(url, () => expectNoHorizontalScroll(page));
  }
});
