import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateChatMessages } from "@/lib/validate";
import { logApi } from "@/lib/log";
import { connectMongo } from "@/lib/mongo";
import ZoomCallCache from "@/lib/ZoomCallCache";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ROUTE = "/api/chat";

const BASE_PROMPT = `You are Binayah AI, a sharp and concise project management assistant for the Binayah Properties tech team. You help with:
- Pipeline planning and prioritization
- Stage status decisions (concept → planned → in-progress → active)
- Task breakdown and team coordination
- Quick code/product questions

The user's live dashboard state is provided under "CURRENT DASHBOARD" below. Use it to answer questions about specific tasks, stages, pipelines, and teammates — refer to them by name when relevant. If the user asks about a task (e.g. "task 1", "what's Blaze working on"), look it up in the dashboard and answer from that data rather than asking for details.

Recent Zoom call summaries are provided under "RECENT CALLS" when available — use them to answer questions about calls, meetings, and what was discussed or decided.

Keep responses short, actionable, and to the point. Use bullet points for lists. Max 3-4 sentences unless the user asks for detail. No fluff.`;

export async function POST(req: NextRequest) {
  logApi(ROUTE, "request");

  // Rate limit: 20 req/min per IP
  const rl = rateLimit(req, ROUTE, 20, 60_000);
  if (!rl.ok) {
    logApi(ROUTE, "rate_limited", { retryAfter: rl.retryAfter });
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests — slow down" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // Payload size check
  const sizeErr = checkContentLength(req);
  if (sizeErr) {
    logApi(ROUTE, "payload_too_large");
    return NextResponse.json({ error: sizeErr }, { status: 400 });
  }

  if (!OPENAI_API_KEY) {
    logApi(ROUTE, "missing_api_key");
    return NextResponse.json({ error: "OpenAI key not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { messages, context } = body as { messages: unknown; context?: string };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    logApi(ROUTE, "validation_fail", { reason: "messages required" });
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const msgsErr = validateChatMessages(messages);
  if (msgsErr) {
    logApi(ROUTE, "validation_fail", { reason: msgsErr });
    return NextResponse.json({ error: msgsErr }, { status: 400 });
  }

  // The dashboard context grows with the number of pipelines/stages and can easily
  // exceed a few thousand chars. Rather than hard-rejecting (which dead-ended the
  // assistant with a misleading "start a fresh conversation" — the context is re-sent
  // every message, so a fresh chat never helped), TRUNCATE it to a generous budget.
  // gpt-4o-mini has a 128k-token window, so ~60k chars (~15k tokens) is safe & cheap.
  const MAX_CONTEXT_CHARS = 60_000;
  let safeContext: string | undefined;
  if (context !== undefined && context !== null && context !== "") {
    if (typeof context !== "string") {
      logApi(ROUTE, "validation_fail", { reason: "context must be a string" });
      return NextResponse.json({ error: "context must be a string" }, { status: 400 });
    }
    safeContext = context.length > MAX_CONTEXT_CHARS
      ? context.slice(0, MAX_CONTEXT_CHARS) + "\n…(dashboard context truncated — ask about a specific pipeline or person for more detail)"
      : context;
  }

  let systemContent = safeContext
    ? `${BASE_PROMPT}\n\n--- CURRENT DASHBOARD ---\n${safeContext}`
    : BASE_PROMPT;

  // Append the most recent Zoom call summaries so the assistant can answer
  // "what were the last few calls about". Best-effort: a DB hiccup must not break
  // chat, and it's size-bounded (≤6 calls × ~1200 chars).
  try {
    await connectMongo();
    const cache = await ZoomCallCache.findOne({ key: "main" }).lean() as
      | { summaries?: { topic?: string; startTime?: string; summary?: string }[] }
      | null;
    const recent = (cache?.summaries ?? []).slice(0, 6);
    if (recent.length) {
      const block = recent.map(c => {
        const when = c.startTime ? new Date(c.startTime).toISOString().slice(0, 16).replace("T", " ") : "";
        return `• ${c.topic || "call"}${when ? ` (${when} UTC)` : ""}\n${(c.summary || "").slice(0, 1200)}`;
      }).join("\n\n");
      systemContent += `\n\n--- RECENT CALLS (${recent.length}) ---\n${block}`;
    }
  } catch (e) {
    logApi(ROUTE, "calls_context_failed", { err: (e as Error).message });
  }

  // 30s timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemContent },
          ...(messages as { role: string; content: string }[]),
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok) {
      logApi(ROUTE, "openai_error", { status: res.status });
      return NextResponse.json({ error: "AI_FAILED", message: data.error?.message || "OpenAI request failed" }, { status: 500 });
    }

    const reply = data.choices?.[0]?.message?.content ?? "";
    logApi(ROUTE, "success");
    return NextResponse.json({ reply });
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      logApi(ROUTE, "timeout");
      return NextResponse.json({ error: "AI_FAILED", message: "Request timed out — try again" }, { status: 504 });
    }
    logApi(ROUTE, "error", { message: (err as Error).message });
    return NextResponse.json({ error: "AI_FAILED", message: "OpenAI request failed" }, { status: 500 });
  }
}
