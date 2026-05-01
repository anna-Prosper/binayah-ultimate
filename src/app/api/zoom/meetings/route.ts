import { NextResponse } from "next/server";
import { getZoomPastMeetings } from "@/lib/zoom";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
const ROUTE = "/api/zoom/meetings";

const ZOOM_USER_EMAIL = "anna@prosper-fi.com";

export async function GET() {
  logApi(ROUTE, "request");
  const result = await getZoomPastMeetings(ZOOM_USER_EMAIL, 20);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status || 502 });
  }
  return NextResponse.json({ ok: true, meetings: result.meetings });
}
