import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.KIE_API_KEY!;
const BASE_STYLE = "stylized human avatar portrait, graphic novel illustration style, thick clean outlines, bold flat colors, solid color background, not anime, Azuki NFT inspired but western street style, profile picture square format, waist-up portrait";
const KIE_BASE = "https://api.kie.ai/api/v1/jobs";

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  if (!prompt?.trim()) return NextResponse.json({ error: "prompt required" }, { status: 400 });
  if (!API_KEY) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  // 1. Submit task
  const createRes = await fetch(`${KIE_BASE}/createTask`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nano-banana-pro",
      input: {
        prompt: `${prompt}, ${BASE_STYLE}`,
        image_input: [],
        aspect_ratio: "1:1",
        resolution: "1K",
        output_format: "png",
      },
    }),
  });
  const createData = await createRes.json();
  if (!createRes.ok || createData.code !== 200) {
    return NextResponse.json({ error: createData.msg || "task creation failed" }, { status: 500 });
  }
  const taskId = createData.data.taskId;

  // 2. Poll until done (max 90s, 3s intervals)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`${KIE_BASE}/recordInfo?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` },
    });
    const pollData = await pollRes.json();
    const state = pollData.data?.state;
    if (state === "success") {
      const urls: string[] = JSON.parse(pollData.data.resultJson).resultUrls;
      // 3. Fetch image and return as base64 so client can use it as data URL
      const imgRes = await fetch(urls[0], {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://kie.ai/" },
      });
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      return NextResponse.json({ image: `data:image/png;base64,${b64}` });
    }
    if (state === "failed") {
      return NextResponse.json({ error: pollData.data?.failMsg || "generation failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "timed out — try again" }, { status: 504 });
}
