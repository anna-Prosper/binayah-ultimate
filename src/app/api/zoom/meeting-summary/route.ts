import { NextRequest, NextResponse } from "next/server";
import { getZoomMeetingSummary } from "@/lib/zoom";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
const ROUTE = "/api/zoom/meeting-summary";

export async function GET(req: NextRequest) {
  logApi(ROUTE, "request");

  const meetingId = req.nextUrl.searchParams.get("meetingId");
  if (!meetingId) {
    return NextResponse.json({ ok: false, error: "meetingId required" }, { status: 400 });
  }

  const result = await getZoomMeetingSummary(meetingId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status || 502 });
  }

  const { ok: _ok, ...rest } = result;
  return NextResponse.json({ ok: true, ...rest });
}
