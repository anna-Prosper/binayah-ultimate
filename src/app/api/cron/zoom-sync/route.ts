/**
 * Hourly Zoom sync cron — refreshes the meeting summary cache during Dubai office hours.
 * Dubai = GST = UTC+4. Office hours 9am-7pm GST = 5am-15pm UTC.
 * Scheduled in vercel.json: "0 5-15 * * *" (every hour 5am-3pm UTC).
 */
import { NextRequest, NextResponse } from "next/server";
import { logApi } from "@/lib/log";

const ROUTE = "/api/cron/zoom-sync";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logApi(ROUTE, "unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logApi(ROUTE, "trigger_resync");

  // Delegate to the meetings POST endpoint which owns the sync logic
  const baseUrl = process.env.NEXTAUTH_URL || "https://dashboard.binayahhub.com";
  const res = await fetch(`${baseUrl}/api/zoom/meetings?force=true`, {
    method: "POST",
    headers: { "x-cron-secret": cronSecret || "" },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  logApi(ROUTE, "done", { count: (data as { meetings?: unknown[] }).meetings?.length ?? 0 });

  return NextResponse.json({ ok: res.ok, count: (data as { meetings?: unknown[] }).meetings?.length ?? 0 });
}
