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

type CachedMeeting = {
  id: string | number;
  uuid: string;
  topic: string;
  startTime: string;
  duration: number;
};

async function fetchFreshMeetings(): Promise<CachedMeeting[]> {
  const result = await getZoomPastMeetings(ZOOM_USER_EMAIL, 30);
  if (!result.ok) return [];

  // Group by meeting id, keep up to 3 recent instances per meeting, exclude unwanted topics
  const grouped = new Map<string, typeof result.meetings>();
  for (const m of result.meetings) {
    if (EXCLUDED_TOPICS.some(ex => m.topic.toLowerCase().includes(ex))) continue;
    const key = String(m.id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  const candidates: typeof result.meetings = [];
  for (const [, instances] of grouped) {
    const sorted = instances
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, MAX_INSTANCES_PER_MEETING);
    candidates.push(...sorted);
  }

  // Probe each specific instance UUID — only keep those with real summaries
  const probed = await Promise.all(
    candidates.map(async m => {
      try {
        const res = await getZoomSummaryByUUID(m.uuid, String(m.id));
        if (!res.ok || !res.summary) return null;
        return { id: m.id, uuid: m.uuid, topic: m.topic, startTime: m.startTime, duration: m.duration };
      } catch { return null; }
    })
  );

  return probed
    .filter((x): x is CachedMeeting => x !== null)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

// GET — return cached results (refresh if stale)
export async function GET() {
  logApi(ROUTE, "request");
  await connectMongo();

  const cache = await ZoomCallCache.findOne({ key: "main" }).lean() as { meetings: CachedMeeting[]; updatedAt: Date } | null;
  const isStale = !cache || (Date.now() - new Date(cache.updatedAt).getTime() > CACHE_TTL_MS);

  if (!isStale && cache?.meetings?.length) {
    return NextResponse.json({ ok: true, meetings: cache.meetings, cached: true, updatedAt: cache.updatedAt });
  }

  // Fetch fresh
  const meetings = await fetchFreshMeetings();
  await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { meetings, updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, meetings, cached: false, updatedAt: new Date() });
}

// POST — force resync
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret) {
    logApi(ROUTE, "unauthorized_resync");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logApi(ROUTE, "resync");
  await connectMongo();

  const meetings = await fetchFreshMeetings();
  await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { meetings, updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, meetings, cached: false, updatedAt: new Date() });
}
