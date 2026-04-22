import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateChatMessages, validateText } from "@/lib/validate";
import { logApi } from "@/lib/log";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ROUTE = "/api/chat";

const BASE_PROMPT = `You are Binayah AI, a sharp and concise project management assistant for the Binayah Properties tech team. You help with:
- Pipeline planning and prioritization
- Stage status decisions (concept → planned → in-progress → active)
- Task breakdown and team coordination
- Quick code/product questions

The user's live dashboard state is provided under "CURRENT DASHBOARD" below. Use it to answer questions about specific tasks, stages, pipelines, and teammates — refer to them by name when relevant. If the user asks about a task (e.g. "task 1", "what's Blaze working on"), look it up in the dashboard and answer from that data rather than asking for details.

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

  if (context) {
    const ctxErr = validateText(context, "context", 8000);
    if (ctxErr) {
      logApi(ROUTE, "validation_fail", { reason: ctxErr });
      return NextResponse.json({ error: ctxErr }, { status: 400 });
    }
  }

  const systemContent = context
    ? `${BASE_PROMPT}\n\n--- CURRENT DASHBOARD ---\n${context}`
    : BASE_PROMPT;

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
