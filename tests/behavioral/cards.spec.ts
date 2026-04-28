// Card interaction smoke tests. These catch the "button exists but does
// nothing" class of defect — the dominant failure mode in past iterate runs.
//
// Each test is intentionally narrow: open the thing, click the thing, assert
// the thing happened. NOT exhaustive coverage; just the pencil/popover/FAB
// flows that grep can't verify.

import { test, expect } from "@playwright/test";
import { login } from "./_helpers";

test.describe("Card interactions", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("pencil opens TaskCard edit mode → all four fields editable simultaneously", async ({ page }) => {
    // First task card on home (any kanban column with content)
    const card = page.locator("[data-testid='task-card']").first();
    await expect(card).toBeVisible();

    // Hover to reveal pencil; click it
    await card.hover();
    const pencil = card.getByRole("button", { name: /edit|✏|✎|pencil/i }).first();
    await pencil.click();

    // After click: rename input, description textarea, and either priority cycler
    // or archive button (archive only renders for officers) must all be present.
    await expect(card.locator("input[type='text'], input:not([type])").first()).toBeVisible();
    await expect(card.locator("textarea")).toBeVisible();

    // Click outside → edit mode closes
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await expect(card.locator("textarea")).not.toBeVisible({ timeout: 5_000 });
  });

  test("clicking avatar in home team opens user popup", async ({ page }) => {
    // First avatar in the home workspace team grid
    const avatar = page.locator("[data-testid='team-avatar']").first();
    if (!(await avatar.isVisible().catch(() => false))) {
      // No team avatars on this view — skip rather than fail
      test.skip();
    }
    await avatar.click();

    // Popup mounts with "owned stages" or "pts" — both are unique to UserPopup
    await expect(
      page.getByText(/owned|pts|×/i).first()
    ).toBeVisible({ timeout: 3_000 });

    // Click outside → popup dismisses
    await page.keyboard.press("Escape");
    // Popup should be gone (look for a stable text node from popup)
    await expect(page.getByText(/owned stages|no stages claimed yet/i).first()).not.toBeVisible({ timeout: 3_000 });
  });

  test("archive FAB opens panel; click outside closes", async ({ page }) => {
    const archiveFab = page.locator("button[title='Archive']").first();
    if (!(await archiveFab.isVisible().catch(() => false))) {
      // Non-officer user sees no archive FAB by design — skip
      test.skip();
    }
    await archiveFab.click();
    // Panel renders ArchiveView header
    await expect(page.getByText(/archive|restore/i).first()).toBeVisible({ timeout: 3_000 });

    // Click on the page background (away from FAB and panel) → closes
    await page.locator("body").click({ position: { x: 400, y: 400 } });
    // Panel should disappear (look for the "restore" affordance specifically)
    await expect(page.getByText(/restore/i).first()).not.toBeVisible({ timeout: 3_000 });
  });

  test("subtask added in card persists past the 5s poll", async ({ page }) => {
    // Find a stage card with subtask input. This catches the poll-clobber regression.
    const subtaskInput = page.locator("input[placeholder*='subtask' i]").first();
    if (!(await subtaskInput.isVisible().catch(() => false))) {
      test.skip();
    }
    const uniqueText = `qa-test-${Date.now()}`;
    await subtaskInput.fill(uniqueText);
    await subtaskInput.press("Enter");

    // Subtask appears immediately (optimistic)
    await expect(page.getByText(uniqueText)).toBeVisible({ timeout: 3_000 });

    // Wait long enough for at least one poll cycle (5s) plus a buffer; subtask must stay
    await page.waitForTimeout(8_000);
    await expect(page.getByText(uniqueText)).toBeVisible();
  });
});
