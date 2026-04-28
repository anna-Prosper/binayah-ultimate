import { defineConfig, devices } from "@playwright/test";

// Behavioral test scaffold for the dashboard. Catches "button exists but
// does nothing" class — the dominant defect-shipping mode in iterate runs.
//
// Run locally:    npx playwright test --config=playwright.config.ts
// Run filtered:   npx playwright test --config=playwright.config.ts cards
// CI / iterate:   npm run test:behavioral
//
// Tests target the LIVE staging deploy by default. Override with
// BASE_URL=http://localhost:3000 to run against a local dev server.

export default defineConfig({
  testDir: "./tests/behavioral",
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared session; serialize to avoid auth races
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL || "https://dashboard-gamification.vercel.app",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
