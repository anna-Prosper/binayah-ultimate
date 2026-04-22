import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { chatBus } from "@/lib/chatBus";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMsg = { id: number; userId: string; text: string; time: string };

const WORKSPACE = { workspaceId: "main" };

export async function GET(req: NextRequest) {
  // Auth-gate: require valid session
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const since = parseInt(req.nextUrl.searchParams.get("since") ?? "0", 10);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send a SSE data event
      const send = (msg: ChatMsg) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        } catch {
          // Stream already closed
        }
      };

      // Subscribe to live bus BEFORE the DB flush to eliminate the race window
      // where a message is emitted between the query completing and the subscription.
      // Messages that arrive during the flush are buffered and deduped below.
      const liveBuffer: ChatMsg[] = [];
      const onMessage = (msg: ChatMsg) => {
        if (flushed) {
          send(msg);
        } else {
          liveBuffer.push(msg);
        }
      };
      let flushed = false;
      chatBus.on("message", onMessage);

      // Flush missed messages since last known id
      const seenIds = new Set<number>();
      try {
        await connectMongo();
        const doc = await PipelineState.findOne(WORKSPACE).lean() as { state?: { chatMessages?: ChatMsg[] } } | null;
        const historical = doc?.state?.chatMessages ?? [];
        const missed = historical.filter((m) => m.id > since);
        for (const m of missed) {
          seenIds.add(m.id);
          send(m);
        }
      } catch {
        // MongoDB unavailable in local dev — continue without historical messages
      }

      // Replay live messages buffered during flush, deduped
      flushed = true;
      for (const m of liveBuffer) {
        if (!seenIds.has(m.id)) {
          send(m);
        }
      }

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Stream closed
        }
      }, 30_000);

      // Cleanup on client disconnect
      const cleanup = () => {
        clearInterval(pingInterval);
        chatBus.off("message", onMessage);
        try { controller.close(); } catch { /* already closed */ }
      };

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      // ReadableStream cancel — nothing to do here since abort event handles cleanup
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
