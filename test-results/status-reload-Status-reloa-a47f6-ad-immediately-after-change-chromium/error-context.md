# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: status-reload.spec.ts >> Status reload persistence >> subtask status survives hard reload immediately after change
- Location: tests/behavioral/status-reload.spec.ts:58:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "domcontentloaded"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]: 🏴‍☠️
          - generic [ref=e7]: Binayah Ultimate
        - generic [ref=e8]: // where strategies are forged
      - button "Continue with Google" [ref=e9] [cursor=pointer]:
        - img [ref=e10]
        - text: continue with google
      - generic [ref=e17]: or
      - button "hide email form" [ref=e20] [cursor=pointer]:
        - generic [ref=e21]:
          - img [ref=e22]
          - text: hide email form
      - generic [ref=e25]:
        - textbox "email" [active] [ref=e26]: anna@prosper-fi.com
        - textbox "your password" [ref=e27]
        - generic [ref=e28]:
          - button "first time? set a password →" [ref=e29] [cursor=pointer]
          - button "sign in" [disabled] [ref=e30]
        - generic [ref=e31]: // access denied — wrong email or password
    - generic: binayah ultimate · v3 · 2026
  - alert [ref=e32]
```

# Test source

```ts
  1  | // Shared helpers for behavioral tests. Login once, reuse session for the spec.
  2  | 
  3  | import { type Page, expect } from "@playwright/test";
  4  | 
  5  | const EMAIL = process.env.TEST_EMAIL || "dev@prosper-fi.com";
  6  | const PASSWORD = process.env.TEST_PASSWORD || "testpass1234";
  7  | 
  8  | export async function login(page: Page) {
  9  |   await page.addInitScript(() => {
  10 |     for (const id of ["anna", "aakarshit", "usama", "ahsan", "abdallah", "prajeesh", "guest1", "guest2"]) {
  11 |       localStorage.setItem(`binayah_welcomed_${id}`, "test");
  12 |     }
  13 |   });
  14 |   await page.goto("/login");
  15 |   await page.getByRole("button", { name: /sign in with email/i }).click();
  16 |   await page.getByPlaceholder(/email/i).fill(EMAIL);
  17 |   await page.getByPlaceholder(/password/i).fill(PASSWORD);
  18 |   await page.getByRole("button", { name: /^sign in$/i }).click();
> 19 |   await page.waitForURL(url => new URL(url).pathname === "/", { timeout: 30_000, waitUntil: "domcontentloaded" });
     |              ^ TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
  20 |   await expect(page.getByRole("button", { name: /^pipelines$/i }).first()).toBeVisible({ timeout: 30_000 });
  21 | }
  22 | 
  23 | export async function gotoKanban(page: Page) {
  24 |   // Sidebar nav: pipelines tab — TasksView in kanban mode
  25 |   const pipelinesNav = page.getByRole("button", { name: /^pipelines$/i }).first();
  26 |   if (await pipelinesNav.isVisible().catch(() => false)) await pipelinesNav.click();
  27 | }
  28 | 
  29 | export async function firstTaskCard(page: Page) {
  30 |   // Match any TaskCard — they have a stage title (h3-equivalent strong text) and a "claim" button
  31 |   return page.locator("[data-testid='task-card']").first();
  32 | }
  33 | 
```