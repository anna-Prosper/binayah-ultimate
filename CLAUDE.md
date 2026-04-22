@AGENTS.md

# Binayah Ultimate — Claude Instructions

## Project

**Pipeline tracker and gamification command center** for the Binayah Properties tech team. Tracks 9 AI initiative pipelines, team ownership (claims), reactions, subtasks, comments, and points-based gamification.

- **Live URL:** https://dashboard-gamification.vercel.app
- **Stack:** Next.js 16.2.3 + React 19 + TypeScript + Tailwind v4 + Mongoose
- **Deploy target:** Vercel only
- **Shared credentials:** `/Users/zoop/.env.shared`

## Context files — read these before every iterate loop

| File | Purpose |
|---|---|
| `.claude/PROJECT_CONTEXT.md` | Codebase map, tech details, QA setup, gotchas |
| `.claude/DESIGN_SYSTEM.md` | All 4 theme tokens, colors, component patterns — canonical |
| `.claude/DESIGN_PRINCIPLES.md` | Quality bar and aesthetic principles |
| `.iterate/state.json` | Active loop state (created by /iterate) |

## Rules

1. **Never ask for credentials.** Read `/Users/zoop/.env.shared` first.
2. **After every push, verify the deploy.** Wait 2 min, check Vercel deploy status, fix if not READY.
3. **Next.js 16.2.3 has breaking changes.** Read `AGENTS.md` before writing any Next.js code.
4. **Tailwind v4 syntax.** `@import "tailwindcss"` not `@tailwind base` — see PROJECT_CONTEXT.md §2.
5. **State lives in two places.** LocalStorage (optimistic) + MongoDB (source of truth). Never bypass the apiSync layer.
