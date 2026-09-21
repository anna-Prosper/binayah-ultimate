import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/whatsapp/broadcast";

// Named group targets → env JIDs. Restricting to a whitelist (rather than an
// arbitrary JID) keeps this cron-secret-gated endpoint from being a blind relay.
function groupJid(key: string): string | undefined {
  const map: Record<string, string | undefined> = {
    binayah_ai: process.env.WHATSAPP_CALL_SUMMARY_GROUP_JID,
    team: process.env.WHATSAPP_GROUP_JID,
    agent: process.env.WHATSAPP_AGENT_GROUP_JID,
    approval: process.env.WHATSAPP_APPROVAL_GROUP_JID,
    offplan: process.env.WHATSAPP_OFFPLAN_GROUP_JID,
  };
  return map[key];
}

// POST — send a plain-text message to a known WhatsApp group. Server-to-server
// only: authenticated with CRON_SECRET (the gateway is IP-locked to our servers).
export async function POST(req: NextRequest) {
  // Header-only — never accept the secret via query string (leaks into access logs/Referer).
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(req, ROUTE, 12, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const body = await req.json().catch(() => null) as { text?: unknown; group?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const groupKey = typeof body?.group === "string" && body.group ? body.group : "binayah_ai";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (text.length > 12000) return NextResponse.json({ error: "text too long (max 12000)" }, { status: 400 });

  const jid = groupJid(groupKey);
  if (!jid) return NextResponse.json({ error: `unknown or unconfigured group: ${groupKey}` }, { status: 400 });

  const result = await sendWhatsAppText(jid, text);
  logApi(ROUTE, result.ok ? "ok" : "fail", { group: groupKey, status: result.status });
  if (!result.ok) {
    return NextResponse.json({ error: "SEND_FAILED", message: result.error || "send failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, group: groupKey });
}
