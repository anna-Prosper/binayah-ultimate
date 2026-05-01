import { NextResponse } from "next/server";
import { getZoomEnv, getZoomServerToken } from "@/lib/zoom";

export const dynamic = "force-dynamic";

export async function GET() {
  const { missing } = getZoomEnv();
  const configured = missing.length === 0;
  const token = configured ? await getZoomServerToken() : null;

  return NextResponse.json({
    configured,
    connected: Boolean(token?.ok),
    mode: "server_to_server",
    missing,
    tokenStatus: token ? token.ok ? 200 : token.status : null,
    tokenError: token && !token.ok ? token.message : null,
    scopes: token?.ok ? token.scope : "",
    expiresIn: token?.ok ? token.expiresIn : null,
  });
}
