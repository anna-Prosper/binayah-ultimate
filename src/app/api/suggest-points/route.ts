import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { logApi } from "@/lib/log";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ROUTE = "/api/suggest-points";

const VALID_KINDS = ["pipeline", "stage", "subtask"] as const;
type Kind = typeof VALID_KINDS[number];

export async function POST(req: NextRequest) {
  logApi(ROUTE, "request");

  // Auth check
  const session = await getServerSession(authOptions);
  if (!session) {
    logApi(ROUTE, "unauthorized");
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Rate limit: 10 req/min per IP
  const rl = rateLimit(req, ROUTE, 10, 60_000);
  if (!rl.ok) {
    logApi(ROUTE, "rate_limited", { retryAfter: rl.retryAfter });
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "// slow down" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  if (!OPENAI_API_KEY) {
    logApi(ROUTE, "missing_api_key");
    return NextResponse.json({ error: "AI_FAILED" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { kind, title, context } = body as { kind: unknown; title: unknown; context?: unknown };

  // Validate kind
  if (!VALID_KINDS.includes(kind as Kind)) {
    logApi(ROUTE, "validation_fail", { reason: "invalid kind" });
    return NextResponse.json({ error: "INVALID_KIND", message: `kind must be one of: ${VALID_KINDS.join(", ")}` }, { status: 400 });
  }

  // Validate title
  if (typeof title !== "string" || title.trim().length === 0) {
    logApi(ROUTE, "validation_fail", { reason: "title missing" });
    return NextResponse.json({ error: "INVALID_TITLE", message: "title is required" }, { status: 400 });
  }
  if (title.length > 200) {
    logApi(ROUTE, "validation_fail", { reason: "title too long" });
    return NextResponse.json({ error: "INVALID_TITLE", message: "title must be ≤200 chars" }, { status: 400 });
  }

  // Validate context (optional)
  if (context !== undefined && typeof context !== "string") {
    return NextResponse.json({ error: "INVALID_CONTEXT" }, { status: 400 });
  }
  if (typeof context === "string" && context.length > 2000) {
    logApi(ROUTE, "validation_fail", { reason: "context too long" });
    return NextResponse.json({ error: "INVALID_CONTEXT", message: "context must be ≤2000 chars" }, { status: 400 });
  }

  const systemPrompt = `You are estimating effort for a ${kind as string} in a project tool. Reply ONLY with a JSON object: {"points": <integer 1-50>, "rationale": <one short sentence>}. Points should reflect typical effort: 1-3 for trivial, 5-13 for medium, 20-50 for major.`;

  const userPrompt = typeof context === "string" && context.trim()
    ? `${title.trim()}\n\nContext: ${context.trim()}`
    : title.trim();

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok) {
      logApi(ROUTE, "openai_error", { status: res.status });
      return NextResponse.json({ error: "AI_FAILED", message: "// suggestion unavailable" }, { status: 500 });
    }

    const raw = data.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logApi(ROUTE, "parse_failed", { raw });
      return NextResponse.json({ error: "PARSE_FAILED", message: "// suggestion unavailable, type a number" }, { status: 400 });
    }

    const result = parsed as Record<string, unknown>;
    const points = result.points;
    const rationale = result.rationale;

    if (
      typeof points !== "number" ||
      !Number.isInteger(points) ||
      points < 1 ||
      points > 50 ||
      typeof rationale !== "string"
    ) {
      logApi(ROUTE, "parse_failed", { parsed });
      return NextResponse.json({ error: "PARSE_FAILED", message: "// suggestion unavailable, type a number" }, { status: 400 });
    }

    logApi(ROUTE, "success", { kind, points });
    return NextResponse.json({ points, rationale });
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      logApi(ROUTE, "timeout");
      return NextResponse.json({ error: "AI_FAILED", message: "// timed out — type a number" }, { status: 504 });
    }
    logApi(ROUTE, "error", { message: (err as Error).message });
    return NextResponse.json({ error: "AI_FAILED", message: "// suggestion unavailable" }, { status: 500 });
  }
}
