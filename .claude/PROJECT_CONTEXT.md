# Project Context — Binayah Ultimate

**Read this file on every iterate loop.** It saves you from rediscovering contracts, gotchas, and patterns. Update it at ship time when new routes/components/patterns land.

---

# §0 — Where to find things

| What | Path |
|---|---|
| This context file | `.claude/PROJECT_CONTEXT.md` |
| **Design system (canonical)** | **`.claude/DESIGN_SYSTEM.md`** — all 4 theme tokens, colors, component patterns |
| Design principles (quality bar) | `.claude/DESIGN_PRINCIPLES.md` |
| Active iterate state | `.iterate/state.json` |
| Past iteration archives | `.iterate/state.*.json` (timestamped) |
| Iterate metrics log | `.iterate/metrics.jsonl` |
| Dev server PID | `.iterate/devserver.pid` |
| Workspace-wide CLAUDE.md | `/Users/zoop/CLAUDE.md` |
| Shared credentials | `/Users/zoop/.env.shared` |

## Codebase map

```
src/
├── app/
│   ├── page.tsx                      # Entry point — getServerSession + redirect /login if no session
│   ├── layout.tsx                    # Root layout — Geist fonts, body
│   ├── login/page.tsx                # Server component — renders LoginClient
│   ├── globals.css                   # Tailwind v4 baseline + font vars ONLY
│   ├── error.tsx / not-found.tsx     # Error boundaries
│   ├── robots.ts                     # robots.txt
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts  # next-auth v4 handler (Google + Credentials)
│       │   ├── signup/route.ts         # POST — whitelist-checked signup, bcrypt-12
│       │   └── prefs/route.ts          # GET/PATCH emailNotifications pref (session-guarded)
│       ├── chat/route.ts             # Claude AI assistant (rate-limited 20/min)
│       ├── generate-pfp/route.ts     # OpenAI avatar generation
│       ├── unsubscribe/route.ts      # GET — HMAC-signed unsubscribe link (public, no auth required)
│       └── pipeline-state/
│           ├── route.ts              # GET/PATCH pipeline state (MongoDB); 423 for locked pipelines
│           ├── activity/route.ts     # POST activity log event; 423 for locked pipelines
│           ├── comments/route.ts     # POST stage comment (stage-key validated); 423 for locked
│           └── messages/route.ts     # POST team chat message
├── components/
│   ├── Dashboard.tsx                 # Main controller — all state lives here; isLocked() guard
│   ├── Stage.tsx                     # Individual stage card UI; isLocked prop blocks edits
│   ├── KanbanView.tsx                # Drag-and-drop kanban board; horizontal scroll snap on mobile
│   ├── OverviewPanel.tsx             # Pipeline metrics / progress summary (lazy-loaded)
│   ├── ChatPanel.tsx                 # Team chat + Claude AI (lazy-loaded; BottomSheet on mobile)
│   ├── LoginClient.tsx               # Login form — warroom dark, Google + email/password
│   ├── NotificationPrefs.tsx         # Email notification toggle pill (in user stats popup)
│   ├── Onboarding.tsx                # 7-step onboarding (including AvatarStep6, FloatingBg)
│   ├── ActivityFeed.tsx              # Real-time activity log panel (lazy-loaded; BottomSheet mobile)
│   ├── SearchFilter.tsx              # Search input + status filter pills
│   └── ui/
│       ├── Avatar.tsx                # AvatarC component — renders user avatar img or initial
│       ├── BottomSheet.tsx           # Portal-rendered bottom drawer — mobile chat/activity panels
│       ├── Skeletons.tsx             # ChatSkeleton, ActivitySkeleton, KanbanSkeleton, OverviewSkeleton
│       ├── ErrorBoundary.tsx         # Class component with retry + showToast callback
│       ├── Toast.tsx                 # useToasts() hook + ToastContainer + RecoveryToast
│       └── primitives.tsx            # Chev (chevron icon), NB (no-border button)
│   └── mockups/
│       ├── MockupShells.tsx          # Mockup rendering wrappers
│       ├── mockupsMap.tsx            # Map of stageKey → React component (next/dynamic, 8 chunks)
│       ├── ResearchMockups.tsx       # Chunk: research pipeline mockups
│       ├── DevMockups.tsx            # Chunk: dev pipeline mockups
│       ├── CoreMockups.tsx           # Chunk: core pipeline mockups
│       ├── CommsMockups.tsx          # Chunk: comms pipeline mockups
│       ├── MultiMockups.tsx          # Chunk: multi pipeline mockups
│       ├── LeadMockups.tsx           # Chunk: leads pipeline mockups
│       ├── ContentMockups.tsx        # Chunk: content pipeline mockups
│       └── OutboundMockups.tsx       # Chunk: outbound + webtools mockups
├── hooks/
│   └── useIsMobile.ts               # SSR-safe hook, 768px breakpoint
├── types/
│   └── next-auth.d.ts               # Session extended with fixedUserId: string
└── lib/
    ├── auth.ts                       # NextAuthOptions, ADMIN_EMAIL_MAP (7 emails → fixedUserId)
    ├── AuthUser.ts                   # Mongoose model: email, passwordHash, fixedUserId, emailNotifications
    ├── data.ts                       # All static data: pipelineData, stageDefaults, USERS_DEFAULT (6 users incl. Prajeesh)
    ├── email.ts                      # nodemailer SMTP transport (SMTP_USER/SMTP_PASS)
    ├── emailTemplates.ts             # claimEmailTemplate + activeEmailTemplate (dark HTML)
    ├── notifyRateLimit.ts            # 5-min in-memory cooldown per (userId, stageKey, eventType)
    ├── sendNotifications.ts          # Fire-and-forget orchestrator; HMAC unsubscribe tokens
    ├── themes.ts                     # mkTheme(id, isDark) → typed theme object; THEME_OPTIONS
    ├── version.ts                    # SCHEMA_VERSION = "v2" — bump on breaking LS schema changes
    ├── PipelineState.ts              # Mongoose schema — includes lockedPipelines (Mixed)
    ├── apiSync.ts                    # fetchState(), patchState(), pushMessage(),
    │                                 #   pushComment(), pushActivity()
    ├── storage.ts                    # lsGet/lsSet + checkSchemaVersion() + clearAllLsKeys()
    ├── generatePDF.ts                # generatePipelineReport() — jspdf report export
    ├── validate.ts                   # validatePatchKeys(), validateStageKey(),
    │                                 #   checkContentLength(), validateSubtasks()
    ├── rateLimit.ts                  # IP-based rate limiter (20 req/min window)
    ├── log.ts                        # logApi(route, event, meta?) — structured JSON logging
    └── mongo.ts                      # Mongoose connection singleton
```

## Key navigation shortcuts

- **All state?** Lives in `Dashboard.tsx` — every `useState` and `useEffect`. Nothing meaningful is global or in a context provider.
- **Theme colors?** `t.*` from `mkTheme(themeId, isDark)` in Dashboard, passed as prop to children.
- **Stage UI?** `Stage.tsx` — receives claims, reactions, subtasks, comments, status, all as props from Dashboard.
- **Static pipeline/stage data?** `src/lib/data.ts` — `pipelineData[]`, `stageDefaults{}`, `USERS_DEFAULT[]`.
- **MongoDB schema?** `src/lib/PipelineState.ts`.
- **API sync?** `src/lib/apiSync.ts` — always use these helpers, never fetch `/api/pipeline-state` directly.
- **Security guards?** `src/lib/validate.ts` — `validateStageKey()` is required before any stage key interpolated into a Mongo path.

---

# §1 — Tech directory

## Stack

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js | 16.2.3 (App Router) |
| UI | React | 19.2.4 |
| Language | TypeScript | 5 (strict mode) |
| Styles | Tailwind CSS | v4 (`@tailwindcss/postcss@4`) |
| Database | MongoDB via Mongoose | 9.4.1 |
| PDF export | jsPDF + jspdf-autotable | 4.2.1 / 5.0.7 |
| Fonts | Geist Sans + Geist Mono | `next/font/google` |

## Deploy target

| Platform | URL |
|---|---|
| Vercel | https://dashboard-gamification.vercel.app |

Push env vars via API — Vercel token in `/Users/zoop/.env.shared`. Never ask the user to set them in the dashboard.

## Environment variables

All env vars are in `/Users/zoop/.env.shared`. Key ones for this project:

| Var | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `OPENAI_API_KEY` | Avatar generation + AI chat |
| `ANTHROPIC_API_KEY` | Claude AI chat (if using Anthropic) |
| `NEXTAUTH_SECRET` | JWT signing + HMAC unsubscribe tokens — must be set |
| `NEXTAUTH_URL` | `https://dashboard-gamification.vercel.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `SMTP_HOST` | Gmail SMTP (smtp.gmail.com) |
| `SMTP_PORT` | 587 |
| `SMTP_SECURE` | false (STARTTLS) |
| `SMTP_USER` | Gmail address for notifications |
| `SMTP_PASS` | Gmail App Password |

`.env.local` at repo root is the local copy. Vercel project: `binayah-ultimate`.

---

# §2 — Critical gotchas (read before writing any code)

## Next.js 16.2.3 breaking changes

> This is NOT the Next.js you know. Read `AGENTS.md` before writing any Next.js code.

- **App Router only.** Pages Router is removed. All routes are `app/` directory.
- **`"use client"` is required** on any component using hooks, state, or browser APIs. The entire Dashboard is client-side.
- **Route handlers:** `export async function GET(req: Request)` — not `handler(req, res)`.
- **`next/font`** — fonts imported as functions, not CSS imports.
- Check `node_modules/next/dist/docs/` for specifics before using any unfamiliar API.

## Tailwind v4 breaking changes

```css
/* CORRECT v4 syntax */
@import "tailwindcss";

/* WRONG — v3 syntax, will crash the build */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

The `@theme inline {}` block is how you expose Tailwind CSS vars. Do not remove it from `globals.css`.

## State architecture — LocalStorage + MongoDB

The app uses a **dual-write** pattern:

1. **All user interactions write to LocalStorage immediately** (optimistic) via `lsSet()`.
2. **On mount**, `fetchState()` pulls the authoritative state from MongoDB and merges it.
3. **On mutations**, `patchState()` pushes deltas to MongoDB in the background.

**Never bypass this pattern.** Don't read/write to MongoDB directly from components. Don't skip `patchState()` on mutations that need to persist.

**MongoDB DNS failure in local dev:** Atlas SRV lookup fails in sandboxed environments. API routes return 500. This is expected — mark `severity: "env"` in QA, do not fail the stage. Vercel staging has real DB access.

## Theme object — NOT a CSS variable system

Unlike most apps, there are **no CSS custom properties for theme colors**. Everything is inline styles driven by the `t` object from `mkTheme()`. When adding new components:

```tsx
// CORRECT — use theme tokens
<div style={{ background: t.bgCard, color: t.text, border: `1px solid ${t.border}` }}>

// WRONG — hardcoded hex
<div style={{ background: "#0d0a18", color: "#f0ecff" }}>

// WRONG — CSS vars that don't exist
<div className="bg-background text-foreground">  // only works for the two globals.css vars
```

## Stage key injection guard (security, implemented Apr 2026)

`validateStageKey(stage)` in `src/lib/validate.ts` **must** be called before interpolating any user-supplied stage key into a MongoDB path (e.g., `state.comments.${stage}`). It rejects:
- Non-string values
- Empty strings
- Strings > 80 chars
- Strings containing `$`, `.`, `__proto__`, `constructor`, `prototype`

The `/api/pipeline-state/comments` route already calls this. Any new route that writes to a dynamic MongoDB path must also call it.

## PATCH key whitelist

`validatePatchKeys(keys)` in `validate.ts` enforces a strict allowlist of top-level keys for PATCH `/api/pipeline-state`. When adding new MongoDB-persisted state fields, **add them to the whitelist in validate.ts** or the PATCH will return 400.

## `hydrateUsers()` — never rely on saved user display data

```ts
function hydrateUsers(saved: UserType[], current: UserType[]): UserType[]
```

On every mount, `USERS_DEFAULT` is the source of truth for `name`, `role`, `color`. Only `avatar` and `aiAvatar` are preserved from localStorage. This means changes to `USERS_DEFAULT` take effect on next mount without clearing cache.

## Auth — next-auth v4 (added Apr 2026)

- **All routes are auth-gated** by `src/middleware.ts` (withAuth). Exceptions: `/login`, `/api/auth/*`, `/api/unsubscribe`, static assets.
- **Adding a new public API route?** Add its path to the middleware matcher exclusion regex: `"/((?!login|api/auth|api/unsubscribe|...).*)"`.
- **Session shape** extended with `fixedUserId` in `src/types/next-auth.d.ts`. Use `getServerSession(authOptions)` in server components/route handlers.
- **ADMIN_EMAIL_MAP** in `src/lib/auth.ts` maps each whitelisted email → `fixedUserId`. Adding a new team member requires adding their email here.
- **`NEXTAUTH_SECRET` must be set** — it doubles as the HMAC key for unsubscribe tokens. If absent, the unsubscribe route returns 503.

## Lazy-loading panels (next/dynamic, added Apr 2026)

ChatPanel, ActivityFeed, KanbanView, OverviewPanel are all lazy-loaded with `next/dynamic({ ssr: false })`. Their loading fallbacks are themed skeletons from `src/components/ui/Skeletons.tsx`.

**CRITICAL:** Use `next/dynamic` (NOT `React.lazy`) — React.lazy has SSR limitations in App Router. The `loading:` prop receives no React props (no `t` token) — use Suspense wrapper pattern to pass theme to loading state.

## Mockup code-splitting (added Apr 2026)

`mockupsMap.tsx` maps stageKey → `ComponentType<{t: T}>` loaded via `next/dynamic`. Mockup components must be React components that accept `{t}`, not plain render functions. They live in 8 chunk files (ResearchMockups, DevMockups, etc.). Do NOT import mockup components directly — always go through `mockupsMap`.

## Locked pipelines (added Apr 2026)

When `pipelineLocks[pipelineId] === true` (state in Dashboard.tsx):
- All edit interactions are blocked client-side via `isLocked(pipelineId)` and `isStageInLockedPipeline(stageName)` guards.
- API enforces 423 PIPELINE_LOCKED for PATCH `/api/pipeline-state`, POST `/api/pipeline-state/comments`, POST `/api/pipeline-state/activity` (non-lock actions).
- `lockedPipelines` is persisted in MongoDB (PipelineState) and synced via `patchState({ lockedPipelines })`.

## Cache version recovery (added Apr 2026)

`SCHEMA_VERSION` in `src/lib/version.ts` is stored in localStorage as `binayah_schema_ver`. On mount, `checkSchemaVersion()` compares. Mismatch → `clearAllLsKeys()` (clears only `binayah_*` prefixed keys, never cookies) → 2-second recovery toast → reload. Bump `SCHEMA_VERSION` when making breaking changes to localStorage key shapes.

## Email notifications (added Apr 2026)

- `sendNotifications(eventType, stageKey, triggerUserId)` is called **fire-and-forget** (`void sendNotifications(...)`) after successful PATCH. Never await it in the request path.
- Internally uses `notifyRateLimit.ts` (5-min cooldown per user×stage×event), checks `AuthUser.emailNotifications` pref, and catches all errors internally — it never throws to the caller.
- HMAC unsubscribe tokens use `NEXTAUTH_SECRET`. Unsubscribe route is public (middleware excluded).

---

# §3 — Data models

## Pipeline (from `data.ts`)

```ts
type Pipeline = {
  id: string;           // e.g. "research", "dev", "core"
  name: string;         // Display name
  icon: string;         // Emoji
  colorKey: string;     // Maps to theme token (see DESIGN_SYSTEM.md §Color key)
  totalHours: string;   // Estimate string e.g. "20-30h"
  priority: string;     // "NOW" | "HIGH" | "MEDIUM" | "LOW"
  desc: string;         // Description
  stages: string[];     // Ordered list of stage IDs (display strings used as keys)
  points: number;       // Total points for pipeline
};
```

The 9 default pipelines: `research`, `dev`, `core`, `comms`, `multi`, `leads`, `content`, `tools`, `outbound`.

## Stage defaults (from `data.ts`)

```ts
stageDefaults: Record<string, { desc: string; points: number; status: string }>
```

Key is the stage name string (e.g., `"PM Agent"`, `"CRM Integration"`). Every stage in `pipelineData[].stages` must have an entry here.

## Status flow

```
STATUS_ORDER = ["concept", "planned", "in-progress", "active"]
```

Status is stored in `stageStatusOverrides[stageName]`. Default is `stageDefaults[stageName].status`. Never write a status value not in `STATUS_ORDER`.

## User shape

```ts
type UserType = {
  id: string;       // "usama" | "anna" | "aakarshit" | "ahsan" | "abdallah" | "prajeesh"
  name: string;
  role: string;
  avatar: string;   // avatar id from AVATARS array, or ""
  color: string;    // hex, e.g. "#bf5af2"
  aiAvatar?: string; // base64 data URL of AI-generated pfp
};
```

## MongoDB document shape (PipelineState.ts)

```ts
{
  _id: ObjectId,          // Singleton document — only one doc exists
  stageStatusOverrides: Record<string, string>,
  claims: Record<string, string[]>,           // stageKey → userId[]
  reactions: Record<string, Record<string, string[]>>,  // stageKey → emoji → userId[]
  subtasks: Record<string, SubtaskItem[]>,
  comments: Record<string, CommentItem[]>,    // stageKey → CommentItem[]
  messages: ChatMsg[],
  activity: ActivityItem[],
  users: UserType[],
  lockedPipelines: Record<string, boolean>,  // pipelineId → true if locked
  // ... other persisted state
}
```

---

# §4 — API routes

| Route | Method | Purpose | Security |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | next-auth Google + Credentials | — |
| `/api/auth/signup` | POST | Register with whitelisted email | Whitelist check, bcrypt-12 |
| `/api/auth/prefs` | GET/PATCH | emailNotifications toggle | Session-guarded |
| `/api/chat` | POST | Claude AI assistant | Rate-limited (20 req/min per IP) |
| `/api/generate-pfp` | POST | OpenAI avatar generation | — |
| `/api/pipeline-state` | GET | Fetch full state from MongoDB | Auth-gated (middleware) |
| `/api/pipeline-state` | PATCH | Update state fields | Key whitelist; 423 if pipeline locked |
| `/api/unsubscribe` | GET | Email unsubscribe via HMAC token | Public (no auth) — HMAC-sha256 signed |
| `/api/pipeline-state/activity` | POST | Log activity event | — |
| `/api/pipeline-state/comments` | POST | Add comment to a stage | `validateStageKey()` on stage param |
| `/api/pipeline-state/messages` | POST | Add team chat message | Content-Length check |

---

# §5 — QA environment

## Constants — do NOT re-check each run

**Dev server:** `http://localhost:3000` — orchestrator starts it. Trust it's live.

**Playwright:** Use `mcp__playwright__*` (Playwright MCP) — preferred for QA agents. Playwright is already installed in `node_modules`. Do NOT reinstall or version-check.

**TypeScript:** `npx tsc --noEmit` must pass. Strict mode. No `any` on new props.

**Package manager:** `npm`. Build: `npm run build`. Dev: `npm run dev`.

**MongoDB in local/sandbox:** Atlas SRV DNS lookup fails — `/api/pipeline-state` returns 500. Expected. Mark `severity: "env"`, do NOT fail QA for this. The dashboard renders from LocalStorage and the client-side state renders fine. Vercel staging catches real DB issues.

**No auth flow.** There is no login/signup. The "user" is selected during the 7-step onboarding and stored in localStorage. QA does not need to authenticate.

**Onboarding bypass:** If `currentUser` exists in localStorage, onboarding is skipped (step forced to 7). Puppeteer/Playwright can set localStorage before navigating to skip it:
```js
await page.evaluate(() => localStorage.setItem("currentUser", "anna"));
```

## Frequently missing dev packages (already present, do NOT reinstall)
- `@playwright/test`
- `typescript`, `@types/react`, `@types/node`

---

# §6 — Gamification mechanics

| Action | Points | Notes |
|---|---|---|
| Stage → `active` (user is a claimer) | Stage's `points` value | Toast + claimAnim fires |
| Claiming any stage | 0 | Ownership, not points |
| Reacting | 0 | Signal, not points |

**Point formula:** `getPoints(userId) = sum of stageDefaults[stage].points` for all stages where `stageStatusOverrides[stage] === "active"` AND `claims[stage].includes(userId)`.

**Leaderboard:** Derived from `getPoints()` across all users. Rendered in `OverviewPanel.tsx`.

**`claimAnim`:** Fires in Dashboard when a stage transitions TO `active` and current user is a claimer. Carries `{ stage: string, pts: number }`. Cleared after 1400ms.

**`ptsFlash`:** Fires when `getPoints(currentUser)` increases. Lasts 1800ms. Used to flash the user's score in the header.
