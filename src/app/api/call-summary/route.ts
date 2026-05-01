import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { validateText } from "@/lib/validate";
import { logApi } from "@/lib/log";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ROUTE = "/api/call-summary";

type Pipeline = { id: string; name: string; stages: string[] };

type SuggestedTask = {
  title: string;
  pipelineId: string;
  pipelineName: string;
  stageName: string | null;
};

export async function POST(req: NextRequest) {
  logApi(ROUTE, "request");

  const rl = rateLimit(req, ROUTE, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI key not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { summary, pipelines } = body as { summary: unknown; pipelines: unknown };

  const summaryErr = validateText(summary, "summary", 12_000);
  if (summaryErr) return NextResponse.json({ error: summaryErr }, { status: 400 });

  if (!Array.isArray(pipelines) || pipelines.length === 0) {
    return NextResponse.json({ error: "pipelines required" }, { status: 400 });
  }

  const pipelineList = (pipelines as Pipeline[])
    .map(p => `- ${p.name} (id: ${p.id}) — stages: ${p.stages.slice(0, 8).join(", ")}`)
    .join("\n");

  const systemPrompt = `You are a project management assistant for Binayah Properties, a Dubai real estate tech company.

Extract concrete action items and tasks from the call summary below. For each task:
1. Write a short, specific title (≤ 10 words)
2. Pick the most relevant pipeline from the list provided
3. If the pipeline has a matching existing stage, suggest that stage — otherwise set stageName to null (a new stage will be created)

Respond ONLY with valid JSON — an array of task objects. No markdown, no explanation.

Format:
[
  { "title": "...", "pipelineId": "...", "pipelineName": "...", "stageName": "..." }
]

Pipelines available:
${pipelineList}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Call summary:\n\n${summary as string}` },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok) {
      logApi(ROUTE, "openai_error", { status: res.status });
      return NextResponse.json({ error: "AI_FAILED", message: data.error?.message }, { status: 500 });
    }

    const raw = data.choices?.[0]?.message?.content ?? "[]";
    let tasks: SuggestedTask[] = [];
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      tasks = JSON.parse(cleaned);
      if (!Array.isArray(tasks)) tasks = [];
    } catch {
      tasks = [];
    }

    // Clamp to 12 tasks max, validate each entry
    tasks = tasks
      .filter(t => t && typeof t.title === "string" && typeof t.pipelineId === "string")
      .slice(0, 12);

    logApi(ROUTE, "ok", { count: tasks.length });
    return NextResponse.json({ tasks });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    logApi(ROUTE, isAbort ? "timeout" : "fetch_error");
    return NextResponse.json({ error: isAbort ? "TIMEOUT" : "FETCH_ERROR" }, { status: 502 });
  }
}
