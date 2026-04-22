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
│       ├── documents/
│       │   ├── route.ts              # GET (list, ?pipelineId filter) + POST (create). Auth-gated.
│       │   └── [id]/route.ts         # GET + PATCH (whitelist: title/content/pipelineId) + DELETE
│       └── pipeline-state/
│           ├── route.ts              # GET/PATCH pipeline state (MongoDB); 423 for locked pipelines
│           ├── activity/route.ts     # POST activity log event; 423 for locked pipelines
│           ├── comments/route.ts     # POST stage comment (stage-key validated); 423 for locked
│           ├── messages/route.ts     # POST team chat message; emits to chatBus after write
│           └── messages/stream/route.ts  # GET SSE stream — Node.js runtime, 30s keep-alive ping
├── components/
│   ├── Dashboard.tsx                 # Main controller — all state lives here; isLocked() guard; activeNavItem state
│   ├── LeftSidebar.tsx               # Permanent left rail (desktop ≥768px) — pipelines/docs/activity/chat nav
│   ├── NotificationBell.tsx          # SSE notification bell — header badge + dropdown. Named event: es.addEventListener("activity",...). Bell types: claimed/active/comment. binayah_notif_seen_at localStorage. Exponential backoff.
│   ├── SearchPalette.tsx             # Cmd+K/Ctrl+K search palette — stages, docs (full-content), people. Module-scope docCache 5-min TTL. export invalidateDocCache(). r.ok guard.
│   ├── WelcomeModal.tsx              # Thin wrapper for <Onboarding sessionUser={...}/>; writes binayah_welcomed_<fixedUserId> on dismiss.
│   ├── DocumentsPanel.tsx            # Notion-style rich text docs — TipTap, 2-col layout, pipeline filter (lazy-loaded). initialDocId prop for Cmd+K routing. 3s debounce-save + blur-save with saveInFlight guard. Attribution strip. invalidateDocCache() after save.
│   ├── Stage.tsx                     # Individual stage card UI; isLocked prop blocks edits
│   ├── KanbanView.tsx                # Drag-and-drop kanban board; horizontal scroll snap on mobile
│   ├── OverviewPanel.tsx             # Pipeline metrics / progress summary (lazy-loaded). Metrics/Timeline toggle. Timeline: status_change log per pipeline, newest-first, canonical status color swatches, AvatarC + relative time.
│   ├── ChatPanel.tsx                 # Team chat + Claude AI (lazy-loaded; SSE subscription on team tab; BottomSheet on mobile)
│   ├── LoginClient.tsx               # Login form — warroom dark, Google + email/password
│   ├── NotificationPrefs.tsx         # Email notification toggle pill (in user stats popup)
│   ├── Onboarding.tsx                # Multi-step personalised onboarding: theme picker → pipeline intros → avatar → celebration. All hook components (TypedTitle, CelebStep) lifted to module level. Identity pre-filled from auth session (sessionUser prop). ob-* keyframe naming in AvatarStep6. binayah_welcomed_<fixedUserId> localStorage flag.
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
    ├── chatBus.ts                    # Module-scoped EventEmitter singleton for SSE chat + activity events; setMaxListeners(200). Emits "message" and "activity". Bell filter in NotificationBell: claimed/active/comment — status_change excluded from bell.
    ├── BinayahDocument.ts            # Mongoose model: title, content (TipTap JSON/Mixed), createdBy, pipelineId, updatedBy (String|null — server-side only, never from client body), timestamps
    ├── auth.ts                       # NextAuthOptions, ADMIN_EMAIL_MAP (8 emails → fixedUserId: anna/aakarshit/usama/ahsan/prajeesh/abdallah)
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

## Left sidebar navigation (added Apr 2026)

- `activeNavItem: "pipelines" | "documents" | "activity" | "chat"` lives in `Dashboard.tsx`, persisted to localStorage key `binayah_activeNav` (additive — no `SCHEMA_VERSION` bump needed).
- **Desktop (≥768px):** Dashboard is `display:flex` row — `LeftSidebar` (220px, fixed) + content area (flex:1).
- **Mobile (<768px):** sidebar is `display:none`. Existing top-bar + BottomSheet patterns are unchanged.
- Adding a new top-level nav item: add to `NAV_ITEMS` array in `LeftSidebar.tsx` AND handle the new `activeNavItem` value in Dashboard's render switch.

## SSE real-time chat (added Apr 2026)

- **`chatBus`** (`src/lib/chatBus.ts`) — module-scoped Node.js `EventEmitter` singleton. Import from both `messages/route.ts` (emitter) and `messages/stream/route.ts` (subscriber). `setMaxListeners(200)` set to avoid Node warnings.
- **Runtime must be `"nodejs"`** on the stream route (`export const runtime = "nodejs"`). Edge Runtime cannot maintain a module-scoped singleton or run Mongoose. This is a hard constraint.
- **Race-free subscribe pattern:** the stream route registers `chatBus.on` BEFORE the MongoDB gap-fill query, buffers live messages during the flush, then replays deduped after. Do not invert this order — subscribe-after-flush loses messages.
- **`?since=<lastId>`:** client passes last known message id on connect. Server flushes only messages with `id > since`. ChatPanel sends this on every `new EventSource(...)` call including reconnects.
- **Keep-alive:** `setInterval(() => controller.enqueue(": ping\n\n"), 30_000)`. Clear interval on `req.signal.aborted`.
- **Vercel serverless note:** SSE connections on Vercel serverless functions time out at 60s by default. The 30s ping keeps the connection alive. On reconnect, gap-fill via `?since=` ensures no message loss.

## Notion-style Documents (added Apr 2026)

- **Model:** `BinayahDocument` in `src/lib/BinayahDocument.ts`. `content` field is `Mixed` (TipTap JSON output object). Indexed on `updatedAt: -1` and `pipelineId: 1`.
- **API routes:** `/api/documents` (list + create) and `/api/documents/[id]` (get + patch + delete). All auth-gated. PATCH whitelist: `title`, `content`, `pipelineId` only. `content` must be a non-null plain object (validated in route).
- **Documents API is NOT subject to `validatePatchKeys` or `validateStageKey`** — those are for `PipelineState` only. Documents has its own whitelist inline in the route.
- **TipTap theming:** `DocumentsPanel` overrides all default TipTap prose styles via CSS vars injected from `t.*` tokens. Do NOT add `@tiptap/extension-*` without also adding theme overrides for the new element types.
- **State isolation:** `DocumentsPanel` owns all documents state locally — list, activeId, save state. Nothing flows up to Dashboard. This is intentional.


## Personalised onboarding — WelcomeModal (added Apr 2026)

- **Flow:** 6 steps — theme picker → pipeline intros (4 steps) → avatar → celebration.
- **Identity pre-filled from session** — `sessionUser: UserType` prop on Onboarding, identity never asked of the user.
- **Displayed once per user:** `binayah_welcomed_<fixedUserId>` localStorage key (set on dismiss). No `SCHEMA_VERSION` bump needed.
- **Hook components must be at module level** — `TypedTitle` and `CelebStep` are defined OUTSIDE the Onboarding component (not inside a conditional render). Violating this causes a React hooks order crash.
- **Keyframe naming:** All CSS keyframes in Onboarding are prefixed `ob-*` (ob-spin, ob-shimmer, ob-fadeIn, ob-popIn, ob-ringExpand, ob-scaleIn, ob-scanlineH) to avoid collisions. AvatarStep6 must use these exact names.

## SSE activity events (added Apr 2026)

The SSE stream at `/api/pipeline-state/messages/stream` now fans out TWO event types:

1. **Default message events** — `data: {...}

` — received by ChatPanel via `es.onmessage`
2. **Named activity events** — `event: activity
data: {...}

` — must be received via `es.addEventListener("activity", handler)`

**Bell event filter:** `claimed`, `active`, `comment` only. `status_change` (Stage 5) is intentionally excluded from the bell — it appears in the timeline view instead.

**chatBus emitters:**
- `messages/route.ts` — emits `"message"` after MongoDB write
- `activity/route.ts` — emits `"activity"` for claimed/active/comment types
- `pipeline-state/route.ts` — emits `"activity"` for status_change types (Stage 5)

All three routes require `export const runtime = "nodejs"` for chatBus access.

## Cmd+K search palette (added Apr 2026)

- **Keyboard trigger:** `(e.metaKey || e.ctrlKey) && e.key === "k"` — both Mac and non-Mac. `e.preventDefault()` required.
- **Document content fetch:** `GET /api/documents?includeContent=true` returns `{_id, title, pipelineId, plaintext}` (server extracts TipTap JSON → plaintext). Cached in `docCache` (module-scope, 5-min TTL) in `SearchPalette.tsx`.
- **Cache invalidation:** `invalidateDocCache()` exported from `SearchPalette.tsx`. Call it from any component that saves a document — `DocumentsPanel` already does this.
- **Routing on Enter:** stage results switch to pipelines view; doc results open DocumentsPanel via `initialDocId` prop (reset to null first via `requestAnimationFrame` so same-doc re-open works); person results open user stats.
- **`r.ok` guard:** always check `if (!r.ok) throw new Error(r.statusText)` before calling `.json()` on fetched responses.

## Document attribution (added Apr 2026)

- **`updatedBy` field:** added to `BinayahDocument` schema. Always set server-side in PATCH from `session.user.fixedUserId`. Client body value discarded — this is a security contract.
- **Debounce-save:** 3s timer in DocumentsPanel; cancelled and immediately saved on blur. `saveInFlight` ref prevents simultaneous PATCH on debounce+blur overlap.
- **Attribution strip:** below the title input in DocumentsPanel. Shows `AvatarC` + "last saved by [name], [relative time]". "// unsaved" in `t.textDim` if `updatedBy` is null.

## Pipeline timeline (added Apr 2026)

- **`status_change` emission:** In PATCH `/api/pipeline-state/route.ts`, when `stageStatusOverrides` changes, a `status_change` activity entry is emitted inline (not via the activity API route). Shape: `{ type: 'status_change', user, target: stageName, detail: "from → to", pipeline: pipelineId, time: Date.now() }`. Also emitted to chatBus.
- **Timeline view:** OverviewPanel has a metrics/timeline toggle. Timeline filters `activityLog` to `type === 'status_change'` AND `pipeline === selectedPipeline`. Newest-first, vertical rail.
- **Status color canon:** `concept → t.textMuted`, `planned → t.amber`, `in-progress → t.cyan`, `active → t.green`. Never break this mapping — it's the language of the app.
- **`status_change` is excluded from the notification bell** — `BELL_TYPES` in `NotificationBell.tsx` does not include it. Keep it that way.

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
| `/api/pipeline-state/messages/stream` | GET | SSE real-time chat stream | Session-gated; **Node.js runtime only** |
| `/api/documents` | GET | List documents (optional ?pipelineId) | Session-gated |
| `/api/documents` | POST | Create document | Session-gated, rate-limited |
| `/api/documents/[id]` | GET | Fetch single doc with content | Session-gated |
| `/api/documents/[id]` | PATCH | Update title/content/pipelineId | Session-gated, whitelisted |
| `/api/documents/[id]` | DELETE | Delete document | Session-gated |
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

**Auth is required.** The app uses next-auth v4. All routes are auth-gated by middleware. QA can verify auth-gated routes return 307 (not 500) when unauthenticated.

**Auth bypass for QA:** Pre-set auth session via next-auth cookies or use `getServerSession` mock. The WelcomeModal is skipped if `binayah_welcomed_<fixedUserId>` is set in localStorage: `await page.evaluate(() => localStorage.setItem("binayah_welcomed_anna", Date.now().toString()));`

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
