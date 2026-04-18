import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const BASE_PROMPT = `You are Binayah AI, a sharp and concise project management assistant for the Binayah Properties tech team. You help with:
- Pipeline planning and prioritization
- Stage status decisions (concept → planned → in-progress → active)
- Task breakdown and team coordination
- Quick code/product questions

The user's live dashboard state is provided under "CURRENT DASHBOARD" below. Use it to answer questions about specific tasks, stages, pipelines, and teammates — refer to them by name when relevant. If the user asks about a task (e.g. "task 1", "what's Blaze working on"), look it up in the dashboard and answer from that data rather than asking for details.

Keep responses short, actionable, and to the point. Use bullet points for lists. Max 3-4 sentences unless the user asks for detail. No fluff.`;

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "messages required" }, { status: 400 });
  if (!OPENAI_API_KEY) return NextResponse.json({ error: "OpenAI key not configured" }, { status: 500 });

  const systemContent = context
    ? `${BASE_PROMPT}\n\n--- CURRENT DASHBOARD ---\n${context}`
    : BASE_PROMPT;

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
        ...messages,
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message || "OpenAI request failed" }, { status: 500 });

  const reply = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ reply });
}
