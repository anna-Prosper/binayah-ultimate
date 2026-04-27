# Design System — Binayah Ultimate

**The definitive reference for Binayah Ultimate's visual language.** All tokens below are verified against `src/lib/themes.ts`. Designer and DEV agents treat this as authoritative for theme-specific decisions.

Read alongside `.claude/DESIGN_PRINCIPLES.md` — principles set the quality bar; this file says how Binayah Ultimate specifically expresses it.

---

## Theme architecture

The design system is **runtime-dynamic** — colors are computed by `mkTheme(id, isDark)` in `src/lib/themes.ts` and passed as a typed object `t` through the component tree. There are no CSS custom properties for theme colors (only Tailwind baseline lives in `globals.css`).

```ts
// How to consume
const t = mkTheme(themeId, isDark);
// Then in JSX:
<div style={{ background: t.bg, color: t.text, border: `1px solid ${t.border}` }}>
```

**Never hardcode a hex color that belongs to the theme palette.** Use `t.*` tokens. If you need a color not on the theme object, derive it inline with opacity (`${t.accent}22` for 13% alpha) or use a Tailwind utility that is truly generic.

---

## Theme tokens — full reference

All tokens exist on every theme. `d = isDark`.

### ThemeBase interface

| Token | Description |
|---|---|
| `t.bg` | Page / outermost background |
| `t.bgCard` | Card and panel surface |
| `t.bgHover` | Hover state for cards / rows |
| `t.bgSoft` | Subtle background (nested sections, sidebars) |
| `t.border` | Default divider / border color |
| `t.text` | Primary body text |
| `t.textSec` | Secondary text (subtitles, descriptions) |
| `t.textMuted` | Muted text (meta, labels, timestamps) |
| `t.textDim` | Dimmed text (disabled, placeholder) |
| `t.surface` | Inner surface (input backgrounds, code blocks) |
| `t.accent` | Primary brand accent |
| `t.accent2` | Secondary accent / contrast highlight |
| `t.green` | Success / "active" status |
| `t.amber` | Warning / "planned" status |
| `t.red` | Error / destructive / "blocked" |
| `t.purple` | Feature tag / highlight |
| `t.cyan` | "in-progress" status / info |
| `t.orange` | Urgent / NOW priority |
| `t.name` | Theme display name (string) |
| `t.icon` | Theme emoji icon |
| `t.sub` | Theme tagline (e.g. `"// where strategies are forged"`) |

### Extended tokens (added by mkTheme after bases)

| Token | Description |
|---|---|
| `t.lime` | Bright lime (chart accent, XP flash) |
| `t.slate` | Muted slate (disabled states) |
| `t.pink` | Pink (soft tag, feminine accents) |
| `t.shadow` | Default box-shadow string |
| `t.shadowLg` | Large box-shadow string |
| `t.isDark` | Boolean — `true` in dark mode |
| `t.themeId` | String ID: `"warroom"` \| `"lab"` \| `"engine"` \| `"nerve"` |

---

## Color values per theme

### War Room (id: `warroom`) — Neon purple / dark ops

| Token | Dark | Light |
|---|---|---|
| `bg` | `#08050f` | `#f8f6f2` |
| `bgCard` | `#0d0a18` | `#fff` |
| `border` | `#251e40` | `#ccc4b8` |
| `text` | `#f0ecff` | `#1a1510` |
| `accent` | `#bf5af2` | `#7c3aed` |
| `accent2` | `#ff2d78` | `#d4235e` |
| `green` | `#00ff88` | `#0a9956` |
| `amber` | `#ffcc00` | `#a67c00` |
| `cyan` | `#00d4ff` | `#0088bb` |
| `orange` | `#ff6b35` | `#c44d1a` |

### The Lab (id: `lab`) — Bio-tech green / clinical

| Token | Dark | Light |
|---|---|---|
| `bg` | `#050a0a` | `#f4f8f6` |
| `bgCard` | `#0a1414` | `#fff` |
| `border` | `#1a3830` | `#b0ccc0` |
| `text` | `#e8fff4` | `#0c1a14` |
| `accent` | `#00e5a0` | `#088a5a` |
| `accent2` | `#00b4d8` | `#0080a0` |
| `green` | `#00ff88` | `#0a9956` |
| `amber` | `#d4c44a` | `#8a7800` |
| `cyan` | `#00d4ff` | `#0088bb` |

### Engine Room (id: `engine`) — Industrial orange / raw power

| Token | Dark | Light |
|---|---|---|
| `bg` | `#0a0808` | `#f8f4f0` |
| `bgCard` | `#141010` | `#fff` |
| `border` | `#382420` | `#c4b0a0` |
| `text` | `#fff0e8` | `#1a1008` |
| `accent` | `#ff6b35` | `#c44d1a` |
| `accent2` | `#ffcc00` | `#a67c00` |
| `green` | `#90d060` | `#4a8a20` |
| `amber` | `#ffcc00` | `#a67c00` |
| `cyan` | `#ffd060` | `#a07800` |

### Nerve Center (id: `nerve`) — Deep navy / neural calm

| Token | Dark | Light |
|---|---|---|
| `bg` | `#06060c` | `#f4f6fa` |
| `bgCard` | `#0c0c18` | `#fff` |
| `border` | `#222440` | `#b8c0d8` |
| `text` | `#e8ecff` | `#0c1020` |
| `accent` | `#5b8cf8` | `#2860d8` |
| `accent2` | `#a78bfa` | `#7050e0` |
| `green` | `#4ade80` | `#1a9050` |
| `amber` | `#fbbf24` | `#a07000` |
| `cyan` | `#38bdf8` | `#1888c0` |

---

## Status → color mapping (canonical, never deviate)

| Status value | Color token | Usage |
|---|---|---|
| `concept` | `t.textMuted` | Greyed out — not started |
| `planned` | `t.amber` | Warming up — committed |
| `in-progress` | `t.cyan` | Active work underway |
| `active` | `t.green` | Live / shipped / done |

`STATUS_ORDER = ["concept", "planned", "in-progress", "active"]` — index is the progression. Status values are used as keys in `stageStatusOverrides` (localStorage + MongoDB) and must not be renamed.

---

## Priority → color mapping

| Priority | Color token | Meaning |
|---|---|---|
| `NOW` | `t.orange` | Burning — do it today |
| `HIGH` | `t.amber` | This sprint |
| `MEDIUM` | `t.cyan` | Next sprint |
| `LOW` | `t.textMuted` | Backlog |

`PRIORITY_CYCLE = ["NOW", "HIGH", "MEDIUM", "LOW"]` — clicking cycles through.

---

## Typography

### Font stack (from `src/app/layout.tsx`)
- **Sans:** Geist Sans (`var(--font-geist-sans)`) — all body text, labels, UI
- **Mono:** Geist Mono (`var(--font-geist-mono)`) — code blocks, pipeline IDs, theme taglines (`t.sub`)

### Usage patterns
- Pipeline/stage names: `font-weight: 600`, `t.text`
- Descriptions: `t.textSec`, `font-size: 0.8rem`
- Meta labels (points, hours, status): `t.textMuted`, `font-size: 0.75rem`
- Theme tagline (`t.sub`): Geist Mono, `t.textDim`, italic — always rendered in mono
- Onboarding titles: `font-weight: 800`, large, `t.text`
- Toast messages: `t.text` on `t.bgCard` surface

---

## Shadows

Use `t.shadow` / `t.shadowLg` — never hardcode `box-shadow` values.

- `t.shadow` (dark): `0 1px 6px rgba(0,0,0,0.3)` — cards, dropdowns
- `t.shadow` (light): `0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)`
- `t.shadowLg` (dark): `0 8px 40px rgba(0,0,0,0.7)` — modals, expanded stage panels
- `t.shadowLg` (light): `0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)`

---

## Component patterns

### Stage card

```tsx
// Collapsed state
<div style={{
  background: t.bgCard,
  border: `1px solid ${t.border}`,
  borderRadius: 10,
  boxShadow: t.shadow,
}}>

// Expanded state (active = glow)
<div style={{
  background: t.bgCard,
  border: `1px solid ${isActive ? t.green + "44" : t.border}`,
  boxShadow: isActive ? `0 0 20px ${t.green}22` : t.shadow,
}}>
```

### Pipeline header

```tsx
<div style={{
  background: `${t.bgSoft}`,
  borderLeft: `3px solid ${colorFromKey(pipeline.colorKey, t)}`,
  padding: "12px 16px",
}}>
```

### Kanban column

```tsx
<div style={{
  background: t.bgSoft,
  border: `1px solid ${t.border}`,
  minHeight: 400,
  borderRadius: 12,
}}>
  {/* Column header */}
  <div style={{ color: statusColor(status, t), fontWeight: 700 }}>
    {STATUS_LABELS[status]}
  </div>
```

### Claim button

```tsx
// Unclaimed
<button style={{ border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 20 }}>
  + claim
</button>

// Claimed (by current user)
<button style={{ background: t.accent + "22", border: `1px solid ${t.accent}`, color: t.accent }}>
  ✓ claimed
</button>
```

### Avatar stack (multiple claimers)

```tsx
// Overlapping avatars — each offset -8px left, bordered with t.bgCard
<div style={{ display: "flex" }}>
  {claimers.map((userId, i) => (
    <div key={userId} style={{ marginLeft: i > 0 ? -8 : 0, border: `2px solid ${t.bgCard}`, borderRadius: "50%" }}>
      <AvatarC user={users.find(u => u.id === userId)!} size={28} t={t} />
    </div>
  ))}
</div>
```

### Toast / celebration

```tsx
// Positioned fixed bottom-right, auto-dismiss 3500ms
<div style={{
  position: "fixed", bottom: 24, right: 24, zIndex: 999,
  background: t.bgCard, border: `1px solid ${t.green}`,
  borderRadius: 12, padding: "12px 20px", boxShadow: t.shadowLg,
  animation: "slideInRight 0.2s ease",
}}>
  <span style={{ color: t.green, fontWeight: 700 }}>{toast.pts}</span>
  <span style={{ color: t.text }}>{toast.text}</span>
</div>
```

### Points flash badge

```tsx
// Fires on ptsFlash = true, fades after 1800ms
<span style={{
  color: ptsFlash ? t.green : t.textMuted,
  fontWeight: ptsFlash ? 800 : 400,
  transition: "color 0.3s, font-weight 0.3s",
}}>
  {myPoints} pts
</span>
```

---

## Reaction system

```ts
export const REACTIONS = ["🔥", "💀", "🚀", "🧠", "⚡", "🫡"];
```

Storage shape: `reactions[stageKey][emoji] = userId[]`

Render rules:
- Show count per emoji; hide emoji if count === 0
- Highlight (glow with `t.accent`) if current user has reacted with that emoji
- Open picker as a floating popover (not inline) — close on outside click

---

## Color key → theme token mapping

Pipeline `colorKey` maps to theme tokens for border accents:

| colorKey | Token |
|---|---|
| `red` | `t.red` |
| `cyan` | `t.cyan` |
| `slate` | `t.slate` |
| `green` | `t.green` |
| `purple` | `t.purple` |
| `amber` | `t.amber` |
| `orange` | `t.orange` |
| `blue` | `t.accent` (warroom/nerve) |
| `lime` | `t.lime` |

---

## Globals.css — what lives there

Only Tailwind v4 baseline and font definitions. **No theme color custom properties** — all theme colors are in `themes.ts`.

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

> **GOTCHA:** `@import "tailwindcss"` is the v4 syntax. **Never write** `@tailwind base; @tailwind components; @tailwind utilities;` — those are v3 directives and will cause a build error with `@tailwindcss/postcss@4`.
