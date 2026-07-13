# Behavioral tests — QUARANTINED (manual, staging-only)

**Status: skipped by default. Not part of CI. Currently stale.**

These Playwright specs catch the "button exists but does nothing" class of bug,
but they are **not** production-grade e2e and should not be trusted as coverage:

- They target a **live deploy** (`BASE_URL`, defaults to the prod URL) and log in
  with a **real account** — so a run pollutes real data and is flaky.
- Auth uses `TEST_EMAIL` / `TEST_PASSWORD` (defaults are stale) via `_helpers.ts`.
- Selectors (e.g. `[data-testid='task-card']`) predate recent UI changes and may
  no longer match.

They are gated behind `RUN_BEHAVIORAL` so a normal checkout never runs (or fails)
them. `npm test` (Jest unit tests) and CI are unaffected.

## Running manually (after refreshing)

```bash
RUN_BEHAVIORAL=1 \
BASE_URL=https://<a-preview-deploy>.vercel.app \
TEST_EMAIL=<dedicated test account> \
TEST_PASSWORD=<its password> \
npx playwright test --config=playwright.config.ts
```

## To make these real coverage (a dedicated task)

1. Run against a **Vercel preview deploy** (per-PR URL), never prod.
2. Use a **dedicated seeded test account**, not an admin/real user.
3. Refresh selectors/auth for the current UI.
4. Add a separate CI job (secrets: preview URL + test creds) — keep it out of the
   fast unit-test gate so it doesn't slow PRs.

See also `docs/migration-databases-out-of-state.md` for the other scheduled
follow-up.
