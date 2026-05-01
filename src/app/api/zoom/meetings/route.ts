import { NextResponse } from "next/server";
import { getZoomPastMeetings, getZoomMeetingInstanceSummary } from "@/lib/zoom";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
const ROUTE = "/api/zoom/meetings";

const ZOOM_USER_EMAIL = "anna@prosper-fi.com";
const EXCLUDED_TOPICS = ["elena", "escro"]; // topics to exclude
const MAX_INSTANCES_PER_MEETING = 3;
const MAX_TOTAL = 15;

export async function GET() {
  logApi(ROUTE, "request");

  const result = await getZoomPastMeetings(ZOOM_USER_EMAIL, 30);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status || 502 });
  }

  // Group by meeting id, keep up to 3 recent instances per meeting
  const grouped = new Map<string, typeof result.meetings>();
  for (const m of result.meetings) {
    const key = String(m.id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  // For each group, sort by date desc and keep top 3
  const candidates: typeof result.meetings = [];
  for (const [, instances] of grouped) {
    const sorted = instances
      .filter(m => !EXCLUDED_TOPICS.some(ex => m.topic.toLowerCase().includes(ex)))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, MAX_INSTANCES_PER_MEETING);
    candidates.push(...sorted);
  }

  // Probe summaries in parallel — only keep ones that actually have content
  const probed = await Promise.all(
    candidates.map(async m => {
      try {
        const res = await getZoomMeetingInstanceSummary(m.id);
        if (!res.ok || !res.summary) return null;
        return { ...m, hasSummary: true };
      } catch {
        return null;
      }
    })
  );

  const meetings = probed
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, MAX_TOTAL);

  return NextResponse.json({ ok: true, meetings });
}
