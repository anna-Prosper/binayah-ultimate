# WhatsApp Notifications Integration Instructions

Use this when adding WhatsApp alerts to another app.

## Goal

Add WhatsApp as a notification channel next to email and in-app alerts. It should reuse the same notification routing rules, respect user notification preferences, and never block the main app action if WhatsApp delivery fails.

## Messaging API

The WhatsApp provider exposes:

- `POST {WHATSAPP_API_BASE_URL}/api/messages/send`
- Headers:
  - `Content-Type: application/json`
  - `x-api-key: {WHATSAPP_API_KEY}`
- Body:

```json
{
  "to": "971501234567",
  "text": "Message text"
}
```

Recipient formats:

- Individual user: digits only, country code first, no `+`
- Group: WhatsApp group JID ending in `@g.us`
- Do not use WhatsApp invite links as recipients. Convert them to a group JID first.

## Environment Variables

Add these to production, preview, and local environments as needed:

```bash
WHATSAPP_API_BASE_URL="https://your-whatsapp-api.example.com"
WHATSAPP_API_KEY="replace-with-secret-key"
```

Map app users to WhatsApp recipients with either one JSON variable:

```bash
WHATSAPP_USER_NUMBERS='{"anna":"79951723526","prajeesh":"971501234568"}'
```

Or individual variables:

```bash
WHATSAPP_USER_ANNA="79951723526"
WHATSAPP_USER_PRAJEESH="971501234568"
```

Use stable app user IDs, not display names, for the keys.

## Recommended Helper

Create a small server-only helper, for example `src/lib/whatsapp.ts`:

```ts
type WhatsAppSendResult = {
  ok: boolean;
  status?: number;
  error?: string;
};

function apiBaseUrl(): string | null {
  return (process.env.WHATSAPP_API_BASE_URL || "").replace(/\/+$/, "") || null;
}

function apiKey(): string | null {
  return process.env.WHATSAPP_API_KEY || null;
}

function sanitizeRecipient(value: string): string {
  return value.trim().replace(/[^\d@._a-z-]/gi, "");
}

export function getWhatsAppRecipientForUser(userId: string): string | undefined {
  const raw = process.env.WHATSAPP_USER_NUMBERS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const value = parsed[userId];
      if (typeof value === "string" && value.trim()) return sanitizeRecipient(value);
    } catch {
      console.warn("[whatsapp] WHATSAPP_USER_NUMBERS is not valid JSON");
    }
  }

  const envKey = `WHATSAPP_USER_${userId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const value = process.env[envKey];
  return value ? sanitizeRecipient(value) : undefined;
}

export async function sendWhatsAppText(to: string, text: string, timeoutMs = 30000): Promise<WhatsAppSendResult> {
  const baseUrl = apiBaseUrl();
  const key = apiKey();
  if (!baseUrl || !key) return { ok: false, error: "WhatsApp API is not configured" };
  if (!to || !text.trim()) return { ok: false, error: "missing recipient or text" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/api/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({ to, text }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: detail || `HTTP ${res.status}` };
    }

    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  } finally {
    clearTimeout(timeout);
  }
}
```

## User Preferences

Add a master preference:

```ts
whatsappNotifications: boolean;
```

Default it to `true`, and allow the user/admin to turn it off from notification settings.

Reuse the same per-event preferences already used by email/in-app alerts. For example, if a user disables `notifyMention`, it should disable mention alerts on WhatsApp too.

## Notification Routing Pattern

When an event happens:

1. Resolve recipients using the same rules as email/in-app notifications.
2. Exclude the actor unless the actor explicitly mentioned themselves.
3. Check `whatsappNotifications !== false`.
4. Check the event preference, such as `notifyAssigned !== false`.
5. Resolve the recipient number/JID using `getWhatsAppRecipientForUser(userId)`.
6. If no WhatsApp recipient is configured, skip silently.
7. Send with `sendWhatsAppText(...)`.
8. Log failures, but do not throw and do not roll back the user action.
9. Rate-limit WhatsApp separately from email, for example with a key prefix like `whatsapp:{eventKey}`.

## Message Style

WhatsApp messages should be short, clear, and human-readable.

Before rendering, clean labels so internal keys never leak to users:

- Strip suffixes like `::1778495490484`
- Collapse repeated spaces
- Prefer `displayStageName`, `task.title`, or another human label over raw database keys
- Avoid showing implementation labels like `stageKey`, `pipelineId`, or Mongo IDs

Good format:

```text
Binayah Dashboard

New assignment:
Fix image issue
Pipeline: News Automation
Assigned by: Anna

Open dashboard:
https://dashboard.example.com
```

Bad format:

```text
Anna mentioned you in WordPress API Auto-Publishing::1778495490484.
Pipeline: WordPress API Auto-Publishing::1778495490484
```

Those numbers are internal IDs. They should never be shown in WhatsApp, email
subjects, email bodies, digests, or in-app notification titles.

Mention format:

```text
Binayah Dashboard

Prajeesh mentioned you in:
Full Launch
Pipeline: New Next.js Website

"@Anna please review this"

Open dashboard:
https://dashboard.example.com
```

Reminder format:

```text
Binayah Dashboard

Reminder: Follow up on valuation tool
Send final confirmation to the team.

Due: 22 May 2026, 10:00
Created by: Anna

Open dashboard:
https://dashboard.example.com
```

Avoid internal IDs in user-facing messages unless they are useful to humans.

## Events To Send Immediately

Recommended immediate WhatsApp alerts:

- New assignment
- New bug/test assigned
- New mention
- New comment on owned/assigned work
- Task approved / points confirmed
- Task moved live or blocked
- Reminder due
- Direct message

Recommended digest-only or no WhatsApp by default:

- Low-priority team activity
- Bulk imports
- System sync events
- Repeated status noise

## Testing Checklist

1. Send a direct provider test:

```ts
await sendWhatsAppText("971501234567", "Test from dashboard");
```

2. Trigger the real app path:
   - Mention a mapped user.
   - Assign a task to a mapped user.
   - Create a reminder for a mapped user.

3. Verify:
   - User receives WhatsApp.
   - Email/in-app still work.
   - Turning off WhatsApp stops WhatsApp only.
   - Turning off a per-event preference stops that event on WhatsApp too.
   - Users without mapped numbers do not throw errors.

## Deployment Notes

After adding or changing Vercel environment variables, redeploy the app so serverless functions receive the new values.

Never commit real API keys or real private phone mappings into source control.
