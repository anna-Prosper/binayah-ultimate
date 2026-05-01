import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import ZoomCallCache from "@/lib/ZoomCallCache";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectMongo();
  const cache = await ZoomCallCache.findOne({ key: "main" }).lean() as {
    summaries?: { uuid: string; topic: string; startTime: string; summary: string }[];
    updatedAt?: Date;
  } | null;

  return NextResponse.json({
    ok: true,
    summaries: cache?.summaries ?? [],
    updatedAt: cache?.updatedAt ?? null,
  });
}
