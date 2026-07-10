# Leads CRM — Design Plan

> Status: **PLAN — decisions pending** (see [Open decisions](#open-decisions) at the bottom).
> Scope: lead capture, routing, lifecycle and accountability for **secondary** and **off-plan** leads at Binayah.
> Drafted 2026-07-10 from a planning session; nothing here is built yet.

## Why

The dashboard tracks the work *around* selling property; leads are the revenue itself. We already have most of the plumbing: a "Lead Lifecycle" pipeline concept, WhatsApp notification infrastructure, CRM-integration tasks in flight, and a claim/points gamification culture that maps naturally onto lead assignment.

---

## 1. Intake (both lead types)

**Sources (candidate set — see decision #4):**
- Website forms: binayah.com listing pages, project landing pages, valuation tool
- WhatsApp inbound: messages to the company number auto-captured as leads
- Manual entry: quick-add for calls and walk-ins
- Portal parsing (Property Finder / Bayut lead emails) — likely phase 2

**Normalization & dedupe — the most important intake rule:**
- Normalize every lead: name, phone (E.164), email, source, language, interest (listing ref / project / area), budget, timestamps for every touch.
- **Dedupe by phone number.** If the same phone re-enquires within ~90 days, the enquiry attaches as *activity on the existing lead* (same owner) instead of creating a new lead. This prevents two agents fighting over one client — the classic brokerage CRM failure.

---

## 2. Secondary — relationship-routed

The listing *is* the relationship, so routing follows ownership:

1. **Lead on a specific listing → the listing agent, instantly.** No pool, no debate — their stock, their seller relationship.
2. **Speed-to-lead SLA:** no first contact logged within **15 min** → WhatsApp nudge to the agent; at **60 min** → escalate to manager (visible, not silent).
3. **Agent unavailable** (off / availability toggle) → route to a named backup or an area pool.
4. **General secondary inquiry** (no specific listing, e.g. "looking for a 2BR in JVC") → area-specialist pool or round-robin.
5. **Repeat SLA breaches** — open decision (#3): keep-with-escalation (protects the seller relationship; recommended) vs reassign-after-breach (maximizes speed-to-lead). Either way, breach stats are tracked; repeat offenders lose *general* lead priority.

---

## 3. Off-plan — speed-routed

No listing owner, open developer inventory, leads go cold in minutes. Candidate models (decision #2):

**Recommended: claim pool + timeout fallback** (fits the existing claim/gamification culture):
1. Lead lands in the off-plan pool → **WhatsApp ping to all active off-plan agents**
2. **First to claim gets it** — rewards the hungry agents
3. **Unclaimed in 10 min → auto-assign** to least-loaded / round-robin so nothing rots

Alternatives considered: pure round-robin (fairest, ignores responsiveness) and performance-weighted distribution (meritocratic, needs history, can feel political).

**Refinements regardless of model:**
- **Smart filters before the ping:** language match (e.g. Russian-speaking lead → Russian-speaking agents first), project/developer specialization if set.
- **"Active" is earned:** availability toggle + recent responsiveness. Slow responders drop out of the ping list automatically — self-cleaning meritocracy.
- **Recycling:** untouched/stale off-plan leads auto-return to the pool after N days (no relationship to protect, unlike secondary).

---

## 4. Lifecycle (shared spine, type-specific labels)

```
New → Contacted → Qualified → Viewing/Meeting → Offer → Won | Lost | Nurture
```

- **Secondary offer path:** Offer → MOU (Form F) → Transfer
- **Off-plan offer path:** EOI → Booking → SPA / down payment
- **Lost requires a reason** (budget, went quiet, competitor, bought elsewhere) — this is where reporting value lives.
- **Nurture** feeds the existing Drip Campaign work.

---

## 5. Nudges & accountability

- Per-status staleness timers → WhatsApp nudge → manager alert on second miss:
  - Contacted: 2 days without activity
  - Qualified: 5 days
  - Post-viewing follow-up: 1 day
- **Per-agent stats:** first-response time, leads handled, conversion by stage, win rate — plugs directly into the existing leaderboard/gamification.

---

## Open decisions

Deliberately left open; answer these before building:

1. **Who works leads in the system?** Current dashboard users are the tech team, not brokerage agents. Options: (a) add agents as dashboard users in a dedicated Leads/CRM workspace; (b) agents never log in — everything via WhatsApp (claim, nudges, status replies), dashboard is the ops/management view; (c) hybrid — WhatsApp day-to-day + lightweight dashboard access to their own lead list and stats.
2. **Off-plan assignment model:** claim pool + timeout (recommended) vs pure round-robin vs performance-weighted.
3. **Secondary SLA breach consequence:** keep + escalate (recommended) vs reassign after the 60-min window.
4. **Phase-1 sources:** website forms / WhatsApp inbound / manual entry / portal parsing (recommended: first three at launch, portals phase 2).

## Phasing sketch (once decisions land)

- **Phase 1:** lead model + dedupe, website-form + manual capture, secondary listing-agent routing, off-plan pool with chosen model, WhatsApp nudges, basic board (New→Won/Lost), per-agent response stats.
- **Phase 2:** portal email parsing, language/specialization filters, staleness recycling, Lost-reason reporting, drip/nurture integration, conversion leaderboard.
