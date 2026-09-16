import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { validateText } from "@/lib/validate";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";

const ROUTE = "/api/call-summary/share";

type ShareTask = { title?: unknown; pipelineName?: unknown };

// Drop the trailing "Attendees" footer (and any divider/blank lines before it)
// that Zoom appends to its summaries — not wanted in the shared group message.
function stripAttendees(text: string): string {
  const lines = text.split("\n");
  const idx = lines.findIndex(l => /^\s*[*#>_-]*\s*attendees\b/i.test(l));
  if (idx < 0) return text;
  let start = idx;
  while (start > 0 && (lines[start - 1].trim() === "" || /^-{2,}$/.test(lines[start - 1].trim()))) start--;
  return lines.slice(0, start).join("\n").trimEnd();
}

// Light markdown → WhatsApp formatting so summaries render cleanly in the group.
function toWhatsApp(text: string): string {
  return text
    .split("\n")
    .map(line => {
      if (line.startsWith("### ")) return `*${line.slice(4).trim()}*`;
      if (line.startsWith("## ")) return `*${line.slice(3).trim()}*`;
      if (line.startsWith("# ")) return `*${line.slice(2).trim()}*`;
      if (line.startsWith("- ")) return `• ${line.slice(2).trim()}`;
      return line;
    })
    .join("\n");
}

// POST — share a call summary + its task list to the team WhatsApp group.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(req, ROUTE, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const groupJid = process.env.WHATSAPP_CALL_SUMMARY_GROUP_JID || process.env.WHATSAPP_GROUP_JID;
  if (!groupJid) return NextResponse.json({ error: "WhatsApp team group is not configured" }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { summary, tasks, topic } = body as { summary: unknown; tasks: unknown; topic: unknown };

  const summaryErr = validateText(summary, "summary", 12_000);
  if (summaryErr) return NextResponse.json({ error: summaryErr }, { status: 400 });

  // tasks is optional: the modal passes extracted tasks; the calls view passes
  // a summary that already embeds its "Next steps" list, so it sends none.
  const cleanTasks = Array.isArray(tasks)
    ? (tasks as ShareTask[])
        .filter(t => t && typeof t.title === "string" && (t.title as string).trim())
        .slice(0, 30)
    : [];

  const header = typeof topic === "string" && topic.trim() ? `📞 *${topic.trim()}*` : "📞 *Call Summary*";
  let text = `${header}\n\n${toWhatsApp(stripAttendees((summary as string).trim()))}`;
  if (cleanTasks.length) {
    const taskLines = cleanTasks
      .map(t => `• ${(t.title as string).trim()}${typeof t.pipelineName === "string" && t.pipelineName ? ` — ${t.pipelineName}` : ""}`)
      .join("\n");
    text += `\n\n✅ *Task list (${cleanTasks.length})*\n${taskLines}`;
  }

  const result = await sendWhatsAppText(groupJid, text);
  logApi(ROUTE, result.ok ? "ok" : "send_failed", { count: cleanTasks.length, status: result.status });

  if (!result.ok) {
    return NextResponse.json({ error: "SEND_FAILED", message: result.error || "WhatsApp send failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, count: cleanTasks.length });
}
