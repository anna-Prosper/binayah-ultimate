import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?zoom=error&reason=${encodeURIComponent(error)}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?zoom=missing_code", req.url));
  }

  // Token exchange + encrypted storage belongs here once the Zoom app is created.
  // Keeping the callback explicit makes the integration visible without pretending
  // calls are connected before credentials/storage exist.
  return NextResponse.redirect(new URL("/?zoom=connected_pending_storage", req.url));
}
