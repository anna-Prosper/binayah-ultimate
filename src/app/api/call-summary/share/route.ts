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

  const groupJid = process.env.WHATSAPP_GROUP_JID;
  if (!groupJid) return NextResponse.json({ error: "WhatsApp team group is not configured" }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { summary, tasks } = body as { summary: unknown; tasks: unknown };

  const summaryErr = validateText(summary, "summary", 12_000);
  if (summaryErr) return NextResponse.json({ error: summaryErr }, { status: 400 });
  if (!Array.isArray(tasks)) return NextResponse.json({ error: "tasks required" }, { status: 400 });

  const cleanTasks = (tasks as ShareTask[])
    .filter(t => t && typeof t.title === "string" && (t.title as string).trim())
    .slice(0, 30);

  const summaryText = (summary as string).trim();
  const trimmedSummary = summaryText.length > 1500 ? `${summaryText.slice(0, 1500)}…` : summaryText;
  const taskLines = cleanTasks.length
    ? cleanTasks
        .map(t => `• ${(t.title as string).trim()}${typeof t.pipelineName === "string" && t.pipelineName ? ` — ${t.pipelineName}` : ""}`)
        .join("\n")
    : "(no tasks captured)";

  const text = `📞 *Call Summary*\n\n${trimmedSummary}\n\n✅ *Task list (${cleanTasks.length})*\n${taskLines}`;

  const result = await sendWhatsAppText(groupJid, text);
  logApi(ROUTE, result.ok ? "ok" : "send_failed", { count: cleanTasks.length, status: result.status });

  if (!result.ok) {
    return NextResponse.json({ error: "SEND_FAILED", message: result.error || "WhatsApp send failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, count: cleanTasks.length });
}
