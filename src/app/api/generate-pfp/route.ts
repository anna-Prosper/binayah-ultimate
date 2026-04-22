import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateText } from "@/lib/validate";
import { logApi } from "@/lib/log";

const API_KEY = process.env.KIE_API_KEY!;
const BASE_STYLE = "stylized human avatar portrait, graphic novel illustration style, thick clean outlines, bold flat colors, solid color background, not anime, Azuki NFT inspired but western street style, profile picture square format, waist-up portrait";
const KIE_BASE = "https://api.kie.ai/api/v1/jobs";
const ROUTE = "/api/generate-pfp";

export async function POST(req: NextRequest) {
  logApi(ROUTE, "request");

  // Rate limit: 5 req/min per IP
  const rl = rateLimit(req, ROUTE, 5, 60_000);
  if (!rl.ok) {
    logApi(ROUTE, "rate_limited", { retryAfter: rl.retryAfter });
    return NextResponse.json(
      { error: "Too many requests — slow down" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // Payload size check
  const sizeErr = checkContentLength(req);
  if (sizeErr) {
    logApi(ROUTE, "payload_too_large");
    return NextResponse.json({ error: sizeErr }, { status: 400 });
  }

  if (!API_KEY) {
    logApi(ROUTE, "missing_api_key");
    return NextResponse.json({ error: "OPENAI_FAILED", message: "API key not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { prompt } = body as { prompt: unknown };

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    logApi(ROUTE, "validation_fail", { reason: "prompt required" });
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const promptErr = validateText(prompt, "prompt", 500);
  if (promptErr) {
    logApi(ROUTE, "validation_fail", { reason: promptErr });
    return NextResponse.json({ error: promptErr }, { status: 400 });
  }

  // 1. Submit task
  const createRes = await fetch(`${KIE_BASE}/createTask`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nano-banana-pro",
      input: {
        prompt: `${prompt.trim()}, ${BASE_STYLE}`,
        image_input: [],
        aspect_ratio: "1:1",
        resolution: "1K",
        output_format: "png",
      },
    }),
  });
  const createData = await createRes.json();
  if (!createRes.ok || createData.code !== 200) {
    logApi(ROUTE, "task_creation_failed", { msg: createData.msg });
    return NextResponse.json({ error: "OPENAI_FAILED", message: createData.msg || "task creation failed" }, { status: 500 });
  }
  const taskId = createData.data.taskId;
  logApi(ROUTE, "task_created", { taskId });

  // 2. Poll until done (max 40s = 20× × 2s). Abort early if client disconnects.
  for (let i = 0; i < 20; i++) {
    // Check if client disconnected
    if (req.signal.aborted) {
      logApi(ROUTE, "client_aborted", { taskId, iteration: i });
      return NextResponse.json({ error: "request cancelled" }, { status: 499 });
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 2000);
      req.signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("aborted", "AbortError")); }, { once: true });
    }).catch(() => null); // if aborted, continue to check signal on next loop iteration

    if (req.signal.aborted) {
      logApi(ROUTE, "client_aborted", { taskId, iteration: i });
      return NextResponse.json({ error: "request cancelled" }, { status: 499 });
    }

    const pollRes = await fetch(`${KIE_BASE}/recordInfo?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` },
    });
    const pollData = await pollRes.json();
    const state = pollData.data?.state;

    if (state === "success") {
      const urls: string[] = JSON.parse(pollData.data.resultJson).resultUrls;
      // Fetch image and return as base64 so client can use it as data URL
      const imgRes = await fetch(urls[0], {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://kie.ai/" },
      });
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      logApi(ROUTE, "success", { taskId });
      return NextResponse.json({ image: `data:image/png;base64,${b64}` });
    }
    if (state === "failed") {
      logApi(ROUTE, "generation_failed", { taskId, failMsg: pollData.data?.failMsg });
      return NextResponse.json({ error: "OPENAI_FAILED", message: pollData.data?.failMsg || "generation failed" }, { status: 500 });
    }
  }

  logApi(ROUTE, "timeout", { taskId });
  return NextResponse.json({ error: "GENERATION_TIMEOUT", message: "timed out — try again" }, { status: 504 });
}
