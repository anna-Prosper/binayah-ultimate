import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: "server_to_server",
    message: "Zoom Server-to-Server OAuth does not use a browser callback URL.",
  });
}
