import { expect, type Page } from "@playwright/test";

/** Page has no horizontal scroll (elements explicitly allowed to scroll, like the Gantt chart, live inside overflow containers). */
export async function expectNoHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, "poziomy scroll strony").toBeLessThanOrEqual(client + 1);
}

/** Logs in a persona through the simulated mObywatel flow (/logowanie → zgoda → moja sytuacja). */
export async function loginPersona(page: Page, firstName: string) {
  await page.goto("/logowanie");
  await page.getByRole("button", { name: `Zaloguj jako ${firstName}` }).click();
  await page.getByRole("button", { name: "Wyrażam zgodę – pobierz dane" }).click();
  await page.waitForURL("**/moja-sytuacja");
}
