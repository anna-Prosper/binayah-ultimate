# Design Principles — Binayah Ultimate

These are principles, not rules. Apply them by **reasoning** about the specific surface you are building, not by pattern-matching. A principle earns its keep by forcing you to ask a better question than "does it work?"

The bar is not "internal tool average." The bar is **Linear, Vercel dashboard, Superhuman, Raycast**. Their ordinary is our ceiling.

---

## Philosophy

**This is a command center, not a dashboard.** A dashboard shows information. A command center makes you feel like you're in control of something powerful. Every interaction should reinforce that feeling. If it feels like a spreadsheet, it failed.

**Dark is the default.** The War Room theme is the soul of this product. All four themes are dark-forward. Design dark first. Light mode is a visitor, not a resident.

**Signal density is a virtue.** This is a power user tool. Show more than a public-facing product would. Compact, information-rich layouts are correct. Sparse layouts feel broken here.

**Gamification must feel earned.** Points flashes, toast animations, and claim badges are not decoration — they are the reward loop. They must feel snappy, satisfying, and intentional. A point animation that feels cheap makes the whole system feel cheap.

**Ownership is visible.** When someone claims a stage, their avatar shows up. When they earn points, the number flashes. Identity is always present. Design every ownership surface like you're designing a trophy.

---

## Visual

**Four themes, one grammar.** Warroom (purple/neon), Lab (bio-green), Engine (orange/industrial), Nerve (navy/neural) — each has its own color palette but shares the same component structure. Never hard-code hex values that only work in one theme. Always use the theme object (`t.accent`, `t.border`, `t.bg`, etc.).

**Every pixel is intentional.** The theme system gives you a full palette. Use it. Don't use Tailwind defaults when `t.accent` exists. Don't use gray-500 when `t.textMuted` is correct. Inline styles driven by the theme object are the pattern — follow it.

**Hierarchy is earned.** Pipeline headers are the loudest element. Stage cards are secondary. Meta text (points, hours, status) is tertiary. Never flatten this hierarchy.

**Status has color semantics — always honor them:**
- `concept` → `t.textMuted` (quiet, not started)
- `planned` → `t.amber` (warming up)
- `in-progress` → `t.cyan` (active work)
- `active` → `t.green` (live, done, winning)

Breaking this mapping breaks the language every user has learned.

---

## Interaction

**Every surface responds.** Stage cards lift on hover. Claim buttons pulse. Reaction pickers animate open. The dashboard breathes. If hovering over something produces no visual response, that is a bug.

**Gamification animations are non-negotiable.** `claimAnim` fires when a stage goes live. `ptsFlash` fires when points increase. `toast` confirms actions. These must be smooth, sub-200ms, and satisfying. Cutting them to save lines of code is always wrong.

**Reactions are signal, not decoration.** The six reactions (🔥 💀 🚀 🧠 ⚡ 🫡) each mean something. Render counts. Show who reacted on hover if space allows. Never strip reactions down to an icon-only display.

**Claims create accountability.** When a user claims a stage, show their avatar immediately (optimistic). The avatar is a promise — make sure it renders crisply at all sizes.

---

## Motion

**Motion has meaning.** The `claimAnim` float-up badge means "you earned points." The `ptsFlash` pulse means "your score just moved." The toast slide-in means "action confirmed." Never add motion that doesn't say something.

**Timing:** 150ms for micro-interactions (hover lifts, button presses). 300ms for state changes (stage expansion, panel slides). 1400ms for celebration animations (claim badge). 3500ms for toast duration. These are calibrated — don't change them without a reason.

---

## Copy

**The copy is the culture.** This product has a voice: tactical, confident, a little irreverent. "gm legend" on the onboarding screen. "// where strategies are forged" as a theme tagline. "claim your territory" not "assign yourself." Match this register. Never write enterprise-neutral copy here.

**Status labels are exact:** `concept`, `planned`, `in-progress`, `active`. These are used as keys in `stageStatusOverrides` and map to `STATUS_ORDER` in data.ts. Never rename them, never add variants.

**Pipeline names are canon.** Never rename them in UI copy — they are referenced in comments, in `pipelineData`, and in team communication.

---

## States

**Empty states are part of the game.** A pipeline with no claims means no one has staked their territory yet. Frame it as opportunity, not emptiness.

**Loading is activity, not waiting.** The app syncs with MongoDB on mount. Show a pulse or skeleton, not a blank. The user is in a command center — silence feels like a dead connection.

---

## How to apply

Before shipping any UI change, ask:

- Does it feel like a command center or a CRUD form?
- Does it honor the theme palette (using `t.*` tokens, never hardcoded hex)?
- Are the status colors exactly right (`planned` = amber, `active` = green)?
- Do gamification animations fire on the right events and feel satisfying?
- Would Linear, Vercel, or Raycast ship this interaction?
- Is the copy in the product's voice — tactical, direct, a little charged?

If any answer is "no" or "not really," it is not done.
