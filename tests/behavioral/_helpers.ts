// Shared helpers for behavioral tests. Login once, reuse session for the spec.

import { type Page, expect } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL || "dev@prosper-fi.com";
const PASSWORD = process.env.TEST_PASSWORD || "testpass1234";

export async function login(page: Page) {
  await page.addInitScript(() => {
    for (const id of ["anna", "aakarshit", "usama", "ahsan", "abdallah", "prajeesh", "guest1", "guest2"]) {
      localStorage.setItem(`binayah_welcomed_${id}`, "test");
    }
  });
  await page.goto("/login");
  await page.getByRole("button", { name: /sign in with email/i }).click();
  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.getByPlaceholder(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(url => new URL(url).pathname === "/", { timeout: 30_000, waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /^pipelines$/i }).first()).toBeVisible({ timeout: 30_000 });
}

export async function gotoKanban(page: Page) {
  // Sidebar nav: pipelines tab — TasksView in kanban mode
  const pipelinesNav = page.getByRole("button", { name: /^pipelines$/i }).first();
  if (await pipelinesNav.isVisible().catch(() => false)) await pipelinesNav.click();
}

export async function firstTaskCard(page: Page) {
  // Match any TaskCard — they have a stage title (h3-equivalent strong text) and a "claim" button
  return page.locator("[data-testid='task-card']").first();
}
