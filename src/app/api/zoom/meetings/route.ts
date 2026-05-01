import { NextResponse } from "next/server";
import { getZoomPastMeetings } from "@/lib/zoom";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
const ROUTE = "/api/zoom/meetings";

const ZOOM_USER_EMAIL = "anna@prosper-fi.com";

const EXCLUDED_TOPICS = ["elena & anna"];

export async function GET() {
  logApi(ROUTE, "request");
  const result = await getZoomPastMeetings(ZOOM_USER_EMAIL, 30);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status || 502 });
  }

  const meetings = result.meetings
    .filter(m => !EXCLUDED_TOPICS.some(ex => m.topic.toLowerCase().includes(ex)))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5);

  return NextResponse.json({ ok: true, meetings });
}
