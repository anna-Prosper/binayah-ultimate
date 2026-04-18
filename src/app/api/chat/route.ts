import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const SYSTEM_PROMPT = `You are Binayah AI, a sharp and concise project management assistant for the Binayah Properties tech team. You help with:
- Pipeline planning and prioritization
- Stage status decisions (concept → in progress → review → active)
- Task breakdown and team coordination
- Quick code/product questions

Keep responses short, actionable, and to the point. Use bullet points for lists. Max 3-4 sentences unless the user asks for detail. No fluff.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "messages required" }, { status: 400 });
  if (!OPENAI_API_KEY) return NextResponse.json({ error: "OpenAI key not configured" }, { status: 500 });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message || "OpenAI request failed" }, { status: 500 });

  const reply = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ reply });
}
