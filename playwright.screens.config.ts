import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Screenshots for docs (KAN-33): `npm run screens` → docs/screens/*.jpg. Not part of `npm run e2e`.
export default defineConfig({
  ...base,
  testDir: "scripts/screens",
  reporter: "list",
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, colorScheme: "light" } },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium", colorScheme: "light" } },
  ],
});
