# Design Audit — Binayah AI Dashboard

## 1. Verdict

The pirate/monospace identity is strong and the theme token system (`themes.ts`) is the right backbone — but execution leaks scale. **Type sizes 6→16 are used ad-hoc** (Stage.tsx fontSize: 7 at L126/163, 8 at L167/169, 9 at L150/157/167/192/242, 11 at L125/262, 12 at L151; team-bar Dashboard.tsx L1246 uses 9, L1251 uses 8, L1280 uses 6). **Border-radius is similarly noisy** (4, 5, 6, 7, 8, 9, 10, 12, 14, 18 all appear in Stage.tsx alone). **Spacing breaks the 4/8 grid**: padding "2px 5px" L144, "2px 6px" L150/157/163, "5px 8px" L292, "5px 10px" L293, "7px 6px" L1278, "9px 10px" L1197 — all should snap to multiples of 4. The 7px and 8px type, paired with letterSpacing 1–3, hits the unreadable floor on retina dark backgrounds. Net: the system is there, it just isn't enforced.

## 2. Highest-impact fixes

**1. Typography scale — collapse to 5 sizes**
- **Issue**: 11 distinct fontSize values (6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 28) across `Stage.tsx`, `Dashboard.tsx` L1128–1336, `LeftSidebar.tsx` L77/94/98/140/175/195.
- **Fix**: Scale = `{micro: 10, label: 11, body: 13, heading: 15, display: 28}`. All `letterSpacing` micro-labels become `0.08em`. Replace 6/7/8 → 10, 9 → 11, 10/11/12 → 13, 13/14 → 15. Keep 28 for the title only.
- **Why**: 7–8px type at letterSpacing 2 is decorative noise — readers can't actually parse it. A 5-step scale lets the monospace feel intentional, not crammed.

**2. Border-radius — 3 values, period**
- **Issue**: Stage card uses 14 (L118), inner buttons 6/8/10/12 (L126/144/150/157/293), checkbox 4 (L279), gallery thumbs 8 (L366), avatar popup 18 (Dashboard L1257). Visual rhythm shatters.
- **Fix**: `sm: 8` (chips, checkboxes, inline buttons), `md: 12` (cards, inputs, popovers), `lg: 16` (hero/header surfaces). Replace globally: 4/5/6/7 → 8; 9/10/11 → 12; 14/18 → 16.
- **Why**: Three steps map to three semantic levels (atom / surface / container) — current 8 values map to nothing.

**3. Header density — collapse the button row**
- **Issue**: `Dashboard.tsx` L1142–1217 stacks 5–6 distinct icon buttons (chat, bell, PDF, theme, sign-out) plus the user card, each with its own `hBtn` styling and an emoji glyph. On the 1440 viewport this reads as a toolbar from a 2010 admin panel.
- **Fix**: Group chat/bell into a single notifications cluster (one rounded-md container, divider between). Move PDF + theme + sign-out into an overflow menu behind a single `…` button. User card stays. Result: avatar + 1 notif cluster + 1 overflow = 3 surfaces instead of 7.
- **Why**: Hierarchy. The header says "everything is equally important" — which means nothing is.

**4. Spacing — snap to 4/8/12/16/20/24/32**
- **Issue**: `Stage.tsx` L144 `2px 5px`, L292 `5px 8px`, L293 `5px 10px`, L298 `letterSpacing: 2`; `Dashboard.tsx` L1197 `9px 10px`, L1278 `7px 6px`, L1330 `2px 6px`. ~40 off-grid values across the three files.
- **Fix**: Round every padding/gap/margin to nearest grid step. `2px 5px` → `4px 8px`; `5px 8px` → `4px 8px`; `9px 10px` → `8px 12px`; `7px 6px` → `8px 8px`. Build a `space = [4,8,12,16,20,24,32]` constant in `themes.ts` and import it.
- **Why**: A grid you can name in your head is the only kind that survives a refactor.

**5. Active-state pattern — pick one**
- **Issue**: LeftSidebar L135–137 uses `bg: accent+22` + `borderLeft: 3px accent` + `color: accent`. Workspace switcher L94 uses `bg: accent+18` + bold weight, no border. Theme picker L1197 uses `bg: opt.color+18` + `border: 1px opt.color+44`. TasksView pillBtn L112 uses `bg: bgCard` + shadow, no accent. Four different "active" looks.
- **Fix**: Single rule — active = `bg: accent + "18"`, `color: accent`, `fontWeight: 700`. No left-borders, no extra border rings, no shadow. Apply across LeftSidebar, theme picker, tabs, segmented controls.
- **Why**: Consistency teaches the user what "selected" looks like in 3 seconds. Right now they re-learn per surface.

**6. Color application rules — codify text tiers**
- **Issue**: `textSec`, `textMuted`, `textDim` are used interchangeably. Stage L125 uses `text` for stage name, L282 uses `textSec` for subtask label, L283 uses `textDim` for initial — but Dashboard L1272 uses `textMuted` for role and L1280 uses `textDim` for "pts" label. No rule.
- **Fix**: `text` = primary content. `textSec` = secondary content (descriptions, claimer names). `textMuted` = labels & meta ("3 stages", "+10pts"). `textDim` = dividers, ghost placeholders, micro-counts only. Document in `themes.ts` as a comment block.
- **Why**: Three muted greys without a rule produce visual mud. With a rule, each tier earns its place.

**7. Stage card chrome — reduce ornament**
- **Issue**: `Stage.tsx` L118 — card carries border + radius + shadow + conditional second shadow + conditional accent ring + hover background change, all transitioning on 4 properties simultaneously. L163 adds a `▸` "preview badge" in pipeline color with its own border, padding, radius.
- **Fix**: Card = `bg: bgSoft`, `border: 1px ${border}`, `radius: 12`. Hover = `border: ${pC}55`. Active = `bg: bgHover`, `border: ${pC}`. Drop the `▸` badge — show the mockup-thumbnail strip in expanded state only. One transition: `border-color 150ms`.
- **Why**: The card is rendered ~30× per pipeline. Every gram of chrome multiplies. Restraint at scale = clarity.

## 3. What NOT to change

The pirate vocabulary (`👑 captain`, `⚓ first mate`, `💀 claim this`, `// where strategies are forged`) is the soul of the product — keep every emoji, every lowercase label, every `//` comment string. The four-theme color personality (warroom purple, lab green, engine orange, nerve blue) is the differentiator from every other PM tool — don't unify it. DM Mono for meta + DM Sans for content is the right pairing; don't introduce a third face.

## 4. Implementation order

1. **Commit 1 — `themes.ts` extension**: add `space`, `radii`, `type` token objects with the scales above + textTier rule comments. No component changes yet. (~30 LOC, zero visual diff.)
2. **Commit 2 — radius pass**: replace all `borderRadius: N` literals across `src/components/**` with the 8/12/16 set. Snapshot test = no broken layouts.
3. **Commit 3 — spacing pass**: snap every off-grid padding/gap to 4/8/12/16/20/24/32. Same files.
4. **Commit 4 — type scale + active-state**: replace fontSize values with the 5-step scale; unify active states across LeftSidebar, TasksView pills, theme picker, workspace switcher.
5. **Commit 5 — header refactor + Stage chrome diet**: collapse `Dashboard.tsx` L1142–1217 into avatar + notif cluster + overflow menu; simplify `Stage.tsx` L118 card chrome and remove the `▸` preview badge.

Each commit is independently revertible. Ship 1+2 first; review live before continuing.
