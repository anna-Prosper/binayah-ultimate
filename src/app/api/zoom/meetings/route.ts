import { NextRequest, NextResponse } from "next/server";
import { getZoomPastMeetings, getZoomSummaryByUUID } from "@/lib/zoom";
import { connectMongo } from "@/lib/mongo";
import ZoomCallCache from "@/lib/ZoomCallCache";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
const ROUTE = "/api/zoom/meetings";

const ZOOM_USER_EMAIL = "anna@prosper-fi.com";
const EXCLUDED_TOPICS = ["elena", "escro"];
const MAX_INSTANCES_PER_MEETING = 3;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

type CachedMeeting = {
  id: string | number;
  uuid: string;
  topic: string;
  startTime: string;
  duration: number;
  summary?: string;
};

type CachedProposal = {
  id: number;
  title: string;
  pipelineId: string;
  pipelineName: string;
  stageName: string | null;
  sourceMeeting: string;
  sourceDate: string;
};

async function extractTasksFromSummary(
  summary: string,
  topic: string
): Promise<Omit<CachedProposal, "id" | "sourceMeeting" | "sourceDate">[]> {
  if (!OPENAI_API_KEY) return [];
  try {
    const pipelineList = [
      "- Web Development (id: web-dev) — stages: Homepage, SEO, Listing pages, Search, Mobile",
      "- AI & Automation (id: ai-automation) — stages: Voice Agent, CRM, RAG, WhatsApp Bot, Lead Tracking",
      "- Data & Analytics (id: data-analytics) — stages: DLD Integration, Property Data, Scraping, Database",
      "- Research & Foundation (id: research) — stages: Market Research, Competitor Analysis, Documentation",
      "- Operations (id: operations) — stages: Team processes, Client management, Reporting",
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a PM assistant for Binayah Properties tech team. Extract concrete action items from the meeting summary. For each: short title (≤10 words), pick best pipeline, matching stage if exists else null. Return ONLY valid JSON array, no markdown.\n\nPipelines:\n${pipelineList}`,
          },
          { role: "user", content: `Meeting: ${topic}\n\n${summary}` },
        ],
        max_tokens: 800,
        temperature: 0.2,
      }),
    });
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const tasks = JSON.parse(cleaned) as { title: string; pipelineId: string; pipelineName: string; stageName: string | null }[];
    return Array.isArray(tasks) ? tasks.slice(0, 10) : [];
  } catch { return []; }
}

async function fetchFreshData(): Promise<{ meetings: CachedMeeting[]; proposals: CachedProposal[] }> {
  const result = await getZoomPastMeetings(ZOOM_USER_EMAIL, 30);
  if (!result.ok) return { meetings: [], proposals: [] };

  const grouped = new Map<string, typeof result.meetings>();
  for (const m of result.meetings) {
    if (EXCLUDED_TOPICS.some(ex => m.topic.toLowerCase().includes(ex))) continue;
    const key = String(m.id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  const candidates: typeof result.meetings = [];
  for (const [, instances] of grouped) {
    candidates.push(...instances
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, MAX_INSTANCES_PER_MEETING));
  }

  // Probe each UUID — keep those with summaries, attach summary text
  const probed = await Promise.all(
    candidates.map(async m => {
      try {
        const res = await getZoomSummaryByUUID(m.uuid, String(m.id));
        if (!res.ok || !res.summary) return null;
        return { id: m.id, uuid: m.uuid, topic: m.topic, startTime: m.startTime, duration: m.duration, summary: res.summary };
      } catch { return null; }
    })
  );

  type ProbedMeeting = { id: string | number; uuid: string; topic: string; startTime: string; duration: number; summary: string };

  const meetings: ProbedMeeting[] = probed
    .filter((x): x is ProbedMeeting => x !== null && typeof x === "object" && "summary" in x)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // Auto-extract tasks from each meeting in parallel
  let idCounter = Date.now();
  const proposalGroups = await Promise.all(
    meetings.map(async m => {
      const tasks = await extractTasksFromSummary(m.summary, m.topic);
      return tasks.map(t => ({
        id: idCounter++,
        title: t.title,
        pipelineId: t.pipelineId,
        pipelineName: t.pipelineName,
        stageName: t.stageName,
        sourceMeeting: m.topic,
        sourceDate: m.startTime,
      }));
    })
  );

  // Strip summaries from meeting objects before caching (keep slim)
  const meetingsSlim: CachedMeeting[] = meetings.map(({ summary: _s, ...m }) => m);
  const proposals = proposalGroups.flat();

  return { meetings: meetingsSlim, proposals };
}

export async function GET() {
  logApi(ROUTE, "request");
  await connectMongo();

  const cache = await ZoomCallCache.findOne({ key: "main" }).lean() as {
    meetings: CachedMeeting[];
    proposals: CachedProposal[];
    updatedAt: Date;
  } | null;

  const isStale = !cache || (Date.now() - new Date(cache.updatedAt).getTime() > CACHE_TTL_MS);

  if (!isStale && cache?.meetings?.length) {
    return NextResponse.json({ ok: true, meetings: cache.meetings, proposals: cache.proposals ?? [], cached: true, updatedAt: cache.updatedAt });
  }

  const { meetings, proposals } = await fetchFreshData();
  await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { meetings, proposals, updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, meetings, proposals, cached: false, updatedAt: new Date() });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logApi(ROUTE, "resync");
  await connectMongo();

  const { meetings, proposals } = await fetchFreshData();
  await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { meetings, proposals, updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, meetings, proposals, cached: false, updatedAt: new Date() });
}
