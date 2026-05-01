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

Extract EVERY action item, next step, and task from the meeting summary — do NOT summarize or merge them. Include all bullet points from "Next steps", "Action items", or similar sections. Keep the original wording as closely as possible.

For each task:
- "title": the task text (keep full detail, up to 20 words)
- "pipelineId": best matching pipeline id from the list
- "pipelineName": matching pipeline name
- "stageName": exact stage name if it matches one in that pipeline, otherwise null

Return ONLY a valid JSON array. No markdown, no explanation.

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
  existingCache: { meetings: CachedMeeting[]; proposals: CachedProposal[]; processedUUIDs: string[] } | null
): Promise<{ meetings: CachedMeeting[]; proposals: CachedProposal[]; processedUUIDs: string[] }> {
  const processedUUIDs = new Set(existingCache?.processedUUIDs ?? []);
  const existingMeetings: CachedMeeting[] = existingCache?.meetings ?? [];
  const existingProposals: CachedProposal[] = existingCache?.proposals ?? [];

  const result = await getZoomPastMeetings(ZOOM_USER_EMAIL, 30);
  if (!result.ok) return { meetings: existingMeetings, proposals: existingProposals, processedUUIDs: [...processedUUIDs] };

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
    // No new meetings — just return existing data with refreshed meeting list
    const allMeetings = candidates
      .map(m => existingMeetings.find(em => em.uuid === m.uuid) ?? { id: m.id, uuid: m.uuid, topic: m.topic, startTime: m.startTime, duration: m.duration })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return { meetings: allMeetings, proposals: existingProposals, processedUUIDs: [...processedUUIDs] };
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

  // Merge with existing (new meetings first)
  const newMeetings: CachedMeeting[] = newWithSummaries.map(({ summary: _s, ...m }) => m);
  const allMeetings = [...newMeetings, ...existingMeetings.filter(em => !newMeetings.find(nm => nm.uuid === em.uuid))]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const newProposals = newProposalGroups.flat();
  const allProposals = [...newProposals, ...existingProposals];

  // Mark all candidates as processed (including ones with no summary — won't retry them)
  const newProcessedUUIDs = [...processedUUIDs, ...newCandidates.map(m => m.uuid)];

  return { meetings: allMeetings, proposals: allProposals, processedUUIDs: newProcessedUUIDs };
}

export async function GET() {
  logApi(ROUTE, "request");
  await connectMongo();

  const cache = await ZoomCallCache.findOne({ key: "main" }).lean() as {
    meetings: CachedMeeting[];
    proposals: CachedProposal[];
    processedUUIDs: string[];
    updatedAt: Date;
  } | null;

  const isStale = !cache || (Date.now() - new Date(cache.updatedAt).getTime() > CACHE_TTL_MS);

  if (!isStale && cache?.meetings?.length) {
    return NextResponse.json({ ok: true, meetings: cache.meetings, proposals: cache.proposals ?? [], cached: true, updatedAt: cache.updatedAt });
  }

  const { meetings, proposals, processedUUIDs } = await syncNewMeetings(cache);
  await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { meetings, proposals, processedUUIDs, updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, meetings, proposals, cached: false, updatedAt: new Date() });
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
    processedUUIDs: string[];
    updatedAt: Date;
  } | null;

  const cacheToUse = forceAll ? null : cache;
  const { meetings, proposals, processedUUIDs } = await syncNewMeetings(cacheToUse);

  await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { meetings, proposals, processedUUIDs, updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, meetings, proposals, cached: false, updatedAt: new Date() });
}
