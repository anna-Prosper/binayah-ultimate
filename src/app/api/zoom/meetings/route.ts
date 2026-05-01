import { NextRequest, NextResponse } from "next/server";
import { getZoomPastMeetings, getZoomSummaryByUUID } from "@/lib/zoom";
import { connectMongo } from "@/lib/mongo";
import ZoomCallCache from "@/lib/ZoomCallCache";
import { logApi } from "@/lib/log";
import { pipelineData } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5min for full sync

const ROUTE = "/api/zoom/meetings";
const ZOOM_USER_EMAIL = "anna@prosper-fi.com";
const EXCLUDED_TOPICS = ["elena", "escro"];
const MAX_INSTANCES_PER_MEETING = 3;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

type CachedMeeting = { id: string | number; uuid: string; topic: string; startTime: string; duration: number };
type CachedProposal = {
  id: number; title: string; pipelineId: string; pipelineName: string;
  stageName: string | null; sourceMeeting: string; sourceDate: string;
};
type CachedSummary = { uuid: string; topic: string; startTime: string; summary: string };

/** Strip Zoom task tracker links and tidy up markdown from AI summaries */
function formatSummary(raw: string): string {
  return raw
    .replace(/\[]\(https?:\/\/tasks\.zoom\.us[^\)]*\)/g, "") // remove Zoom task links
    .replace(/\[([^\]]+)\]\(https?:\/\/tasks\.zoom\.us[^\)]*\)/g, "$1") // links with text → keep text
    .replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
    .trim();
}

async function extractTasksFromSummary(
  summary: string, topic: string
): Promise<Omit<CachedProposal, "id" | "sourceMeeting" | "sourceDate">[]> {
  if (!OPENAI_API_KEY) return [];
  try {
    const pipelineList = pipelineData
      .map(p => `- ${p.name} (id: ${p.id}) — stages: ${p.stages.join(", ")}`)
      .join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a PM assistant for Binayah Properties tech team.

Extract EVERY action item and next step from the meeting summary. Do NOT skip, merge, or summarize any tasks.

For each task:
- "title": rewrite as a clear, actionable task in ≤15 words. If assigned to someone specific, add "(Assignee)" at the end. Example: "Set up CRM lead tracking locally (Aakarshit)"
- "pipelineId": best matching pipeline id
- "pipelineName": matching pipeline name
- "stageName": exact stage name if it closely matches one in that pipeline, otherwise null

Rules:
- One JSON object per bullet point / action item — never merge two tasks into one
- If a bullet has multiple distinct actions, split them into separate tasks
- Keep technical specifics (tool names, formats, people mentioned)
- Return ONLY a valid JSON array, no markdown

Pipelines:\n${pipelineList}`,
          },
          { role: "user", content: `Meeting: ${topic}\n\n${summary}` },
        ],
        max_tokens: 3000,
        temperature: 0.1,
      }),
    });
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const tasks = JSON.parse(cleaned) as { title: string; pipelineId: string; pipelineName: string; stageName: string | null }[];
    return Array.isArray(tasks) ? tasks : [];
  } catch { return []; }
}

// Incremental: only process UUIDs not yet in processedUUIDs
async function syncNewMeetings(
  existingCache: { meetings: CachedMeeting[]; proposals: CachedProposal[]; summaries: CachedSummary[]; processedUUIDs: string[] } | null
): Promise<{ meetings: CachedMeeting[]; proposals: CachedProposal[]; summaries: CachedSummary[]; processedUUIDs: string[] }> {
  const processedUUIDs = new Set(existingCache?.processedUUIDs ?? []);
  const existingMeetings: CachedMeeting[] = existingCache?.meetings ?? [];
  const existingProposals: CachedProposal[] = existingCache?.proposals ?? [];
  const existingSummaries: CachedSummary[] = existingCache?.summaries ?? [];

  const result = await getZoomPastMeetings(ZOOM_USER_EMAIL, 30);
  if (!result.ok) return { meetings: existingMeetings, proposals: existingProposals, summaries: existingSummaries, processedUUIDs: [...processedUUIDs] };

  // Group and filter
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

  // Only process UUIDs we haven't seen before
  const newCandidates = candidates.filter(m => !processedUUIDs.has(m.uuid));
  logApi(ROUTE, "incremental_sync", { total: candidates.length, new: newCandidates.length });

  if (newCandidates.length === 0) {
    const allMeetings = candidates
      .map(m => existingMeetings.find(em => em.uuid === m.uuid) ?? { id: m.id, uuid: m.uuid, topic: m.topic, startTime: m.startTime, duration: m.duration })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return { meetings: allMeetings, proposals: existingProposals, summaries: existingSummaries, processedUUIDs: [...processedUUIDs] };
  }

  // Probe new candidates for summaries
  const probed = await Promise.all(
    newCandidates.map(async m => {
      try {
        const res = await getZoomSummaryByUUID(m.uuid, String(m.id));
        if (!res.ok || !res.summary) return null;
        return { ...m, summary: res.summary };
      } catch { return null; }
    })
  );

  const newWithSummaries = probed.filter((x): x is (typeof newCandidates[0] & { summary: string }) => x !== null);

  // Extract tasks from new meetings
  let idCounter = Date.now();
  const newProposalGroups = await Promise.all(
    newWithSummaries.map(async m => {
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

  // Build new summaries (formatted)
  const newSummaries: CachedSummary[] = newWithSummaries.map(m => ({
    uuid: m.uuid,
    topic: m.topic,
    startTime: m.startTime,
    summary: formatSummary(m.summary),
  }));

  // Merge with existing (new meetings first)
  const newMeetings: CachedMeeting[] = newWithSummaries.map(({ summary: _s, ...m }) => m);
  const allMeetings = [...newMeetings, ...existingMeetings.filter(em => !newMeetings.find(nm => nm.uuid === em.uuid))]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const newProposals = newProposalGroups.flat();
  const allProposals = [...newProposals, ...existingProposals];
  const allSummaries = [...newSummaries, ...existingSummaries.filter(s => !newSummaries.find(ns => ns.uuid === s.uuid))];

  // Only mark meetings as processed once we actually captured a summary.
  // Zoom can expose a recording before AI Companion has finished producing
  // the summary; marking every probed UUID here made later resyncs skip calls
  // that became ready a few minutes later.
  const newProcessedUUIDs = [...processedUUIDs, ...newWithSummaries.map(m => m.uuid)];

  return { meetings: allMeetings, proposals: allProposals, summaries: allSummaries, processedUUIDs: newProcessedUUIDs };
}

export async function GET() {
  logApi(ROUTE, "request");
  await connectMongo();

  const cache = await ZoomCallCache.findOne({ key: "main" }).lean() as {
    meetings: CachedMeeting[];
    proposals: CachedProposal[];
    summaries: CachedSummary[];
    processedUUIDs: string[];
    updatedAt: Date;
  } | null;

  const isStale = !cache || (Date.now() - new Date(cache.updatedAt).getTime() > CACHE_TTL_MS);

  if (!isStale && cache?.meetings?.length) {
    return NextResponse.json({ ok: true, meetings: cache.meetings, proposals: cache.proposals ?? [], summaries: cache.summaries ?? [], cached: true, updatedAt: cache.updatedAt });
  }

  const { meetings, proposals, summaries, processedUUIDs } = await syncNewMeetings(cache);
  await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { meetings, proposals, summaries, processedUUIDs, updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, meetings, proposals, summaries, cached: false, updatedAt: new Date() });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?force=true resets processedUUIDs and reprocesses everything
  const forceAll = req.nextUrl.searchParams.get("force") === "true";

  logApi(ROUTE, forceAll ? "resync_force_all" : "resync_incremental");
  await connectMongo();

  const cache = await ZoomCallCache.findOne({ key: "main" }).lean() as {
    meetings: CachedMeeting[];
    proposals: CachedProposal[];
    summaries: CachedSummary[];
    processedUUIDs: string[];
    updatedAt: Date;
  } | null;

  const cacheToUse = forceAll ? null : cache;
  const { meetings, proposals, summaries, processedUUIDs } = await syncNewMeetings(cacheToUse);

  await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { meetings, proposals, summaries, processedUUIDs, updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, meetings, proposals, summaries, cached: false, updatedAt: new Date() });
}
