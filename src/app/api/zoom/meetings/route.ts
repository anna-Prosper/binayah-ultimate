import { NextRequest, NextResponse } from "next/server";
import { getRecentZoomRecordings, getZoomPastMeetings, getZoomSummaryByUUID, type ZoomPastMeeting } from "@/lib/zoom";
import { connectMongo } from "@/lib/mongo";
import ZoomCallCache from "@/lib/ZoomCallCache";
import { logApi } from "@/lib/log";
import { pipelineData } from "@/lib/data";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5min for full sync

const ROUTE = "/api/zoom/meetings";
const ZOOM_USER_EMAILS = [
  "anna@prosper-fi.com",
  "aakarshit@prosper-fi.com",
  "uk@prosper-fi.com",
  "mamr@binayah.com",
  "pm@binayah.com",
  "ak@binayah.com",
];
const EXCLUDED_TOPICS = ["elena", "escro"];
const MAX_CANDIDATES_TO_PROBE = 80;
const HOME_CALL_LIMIT = 7;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

type CachedMeeting = { id: string | number; uuid: string; topic: string; startTime: string; duration: number };
type CachedProposal = {
  id: number; title: string; pipelineId: string; pipelineName: string;
  stageName: string | null; sourceMeeting: string; sourceDate: string; sourceUUID?: string;
};
type CachedSummary = { uuid: string; topic: string; startTime: string; summary: string };

async function isAuthorized(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret === cronSecret) return true;
  return Boolean(await getServerSession(authOptions));
}

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

function uniqueByUUID(meetings: ZoomPastMeeting[]): ZoomPastMeeting[] {
  const seen = new Set<string>();
  return meetings
    .filter(m => m.uuid && !EXCLUDED_TOPICS.some(ex => m.topic.toLowerCase().includes(ex)))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .filter(m => {
      if (seen.has(m.uuid)) return false;
      seen.add(m.uuid);
      return true;
    });
}

async function getZoomCandidates(): Promise<ZoomPastMeeting[]> {
  const lists = await Promise.all([
    ...ZOOM_USER_EMAILS.map(async email => {
      const result = await getZoomPastMeetings(email, 100);
      return result.ok ? result.meetings : [];
    }),
    (async () => {
      const result = await getRecentZoomRecordings(30);
      if (!result.ok) return [];
      return result.meetings.map(m => ({
        id: m.id || "",
        uuid: m.uuid || "",
        topic: m.topic || "Untitled Zoom call",
        startTime: m.start_time || "",
        duration: m.duration || 0,
      }));
    })(),
  ]);
  return uniqueByUUID(lists.flat()).slice(0, MAX_CANDIDATES_TO_PROBE);
}

function latestArchiveMeetings(summaries: CachedSummary[]): CachedMeeting[] {
  return summaries
    .map(s => ({ id: s.uuid, uuid: s.uuid, topic: s.topic, startTime: s.startTime, duration: 0 }))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

function withProposalUUIDs(proposals: CachedProposal[], meetings: CachedMeeting[]): CachedProposal[] {
  return proposals.map(p => {
    if (p.sourceUUID) return p;
    const match = meetings.find(m => m.topic === p.sourceMeeting && m.startTime === p.sourceDate);
    return match ? { ...p, sourceUUID: match.uuid } : p;
  });
}

function limitHomeData(meetings: CachedMeeting[], proposals: CachedProposal[], summaries: CachedSummary[]) {
  const homeMeetings = meetings
    .filter(m => summaries.some(s => s.uuid === m.uuid))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, HOME_CALL_LIMIT);
  const homeUUIDs = new Set(homeMeetings.map(m => m.uuid));
  const normalizedProposals = withProposalUUIDs(proposals, meetings);
  const homeProposals = normalizedProposals.filter(p => p.sourceUUID ? homeUUIDs.has(p.sourceUUID) : homeMeetings.some(m => m.topic === p.sourceMeeting && m.startTime === p.sourceDate));
  return { homeMeetings, homeProposals };
}

// Incremental: only process UUIDs not yet in processedUUIDs
async function syncNewMeetings(
  existingCache: { meetings: CachedMeeting[]; proposals: CachedProposal[]; summaries: CachedSummary[]; processedUUIDs: string[] } | null
): Promise<{ meetings: CachedMeeting[]; proposals: CachedProposal[]; summaries: CachedSummary[]; processedUUIDs: string[] }> {
  const processedUUIDs = new Set(existingCache?.processedUUIDs ?? []);
  const existingMeetings: CachedMeeting[] = existingCache?.meetings ?? latestArchiveMeetings(existingCache?.summaries ?? []);
  const existingSummaries: CachedSummary[] = existingCache?.summaries ?? [];
  const existingProposals: CachedProposal[] = withProposalUUIDs(existingCache?.proposals ?? [], existingMeetings);

  const candidates = await getZoomCandidates();

  // Only process UUIDs we haven't seen before
  const newCandidates = candidates.filter(m => !processedUUIDs.has(m.uuid));
  logApi(ROUTE, "incremental_sync", { total: candidates.length, new: newCandidates.length });

  if (newCandidates.length === 0) {
    const allMeetings = latestArchiveMeetings(existingSummaries.length ? existingSummaries : existingMeetings.map(m => ({ uuid: m.uuid, topic: m.topic, startTime: m.startTime, summary: "" })));
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
        sourceUUID: m.uuid,
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
  const newMeetings: CachedMeeting[] = newWithSummaries.map(m => ({
    id: m.id,
    uuid: m.uuid,
    topic: m.topic,
    startTime: m.startTime,
    duration: m.duration,
  }));
  const allMeetings = [...newMeetings, ...existingMeetings.filter(em => !newMeetings.find(nm => nm.uuid === em.uuid))]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const newProposals = newProposalGroups.flat();
  const newProposalUUIDs = new Set(newWithSummaries.map(m => m.uuid));
  const allProposals = [...newProposals, ...existingProposals.filter(p => !p.sourceUUID || !newProposalUUIDs.has(p.sourceUUID))];
  const allSummaries = [...newSummaries, ...existingSummaries.filter(s => !newSummaries.find(ns => ns.uuid === s.uuid))];

  // Only mark meetings as processed once we actually captured a summary.
  // Zoom can expose a recording before AI Companion has finished producing
  // the summary; marking every probed UUID here made later resyncs skip calls
  // that became ready a few minutes later.
  const newProcessedUUIDs = Array.from(new Set([...processedUUIDs, ...newWithSummaries.map(m => m.uuid)]));

  return { meetings: allMeetings, proposals: allProposals, summaries: allSummaries, processedUUIDs: newProcessedUUIDs };
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
    const { homeMeetings, homeProposals } = limitHomeData(cache.meetings, cache.proposals ?? [], cache.summaries ?? []);
    return NextResponse.json({ ok: true, meetings: homeMeetings, proposals: homeProposals, summaries: cache.summaries ?? [], cached: true, updatedAt: cache.updatedAt });
  }

  const { meetings, proposals, summaries, processedUUIDs } = await syncNewMeetings(cache);
  await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { meetings, proposals, summaries, processedUUIDs, updatedAt: new Date() },
    { upsert: true }
  );

  const { homeMeetings, homeProposals } = limitHomeData(meetings, proposals, summaries);
  return NextResponse.json({ ok: true, meetings: homeMeetings, proposals: homeProposals, summaries, cached: false, updatedAt: new Date() });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?force=true ignores the cache TTL, but already archived summaries are still kept.
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

  const { meetings, proposals, summaries, processedUUIDs } = await syncNewMeetings(cache);

  await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { meetings, proposals, summaries, processedUUIDs, updatedAt: new Date() },
    { upsert: true }
  );

  const { homeMeetings, homeProposals } = limitHomeData(meetings, proposals, summaries);
  return NextResponse.json({ ok: true, meetings: homeMeetings, proposals: homeProposals, summaries, cached: false, updatedAt: new Date(), forced: forceAll });
}
