import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { chatBus } from "@/lib/chatBus";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import ChatMessage from "@/lib/ChatMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMsg = { id: number; userId: string; text: string; time: string };
type ActivityItem = { type: string; user: string; target: string; detail: string; time: number; notifyTo?: string[] };

const WORKSPACE = { workspaceId: "main" };

export async function GET(req: NextRequest) {
  // Auth-gate: require valid session
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const since = parseInt(req.nextUrl.searchParams.get("since") ?? "0", 10);
  const sinceActivity = req.nextUrl.searchParams.get("sinceActivity") ?? null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send a SSE data event (default message event type)
      const send = (msg: ChatMsg) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        } catch {
          // Stream already closed
        }
      };

      // Helper to send a SSE activity event (named event type — clients must add
      // a specific addEventListener("activity", ...) listener to receive these)
      const sendActivity = (item: ActivityItem) => {
        try {
          controller.enqueue(encoder.encode(`event: activity\ndata: ${JSON.stringify(item)}\n\n`));
        } catch {
          // Stream already closed
        }
      };

      // Subscribe to live bus BEFORE the DB flush to eliminate the race window
      // where a message/activity is emitted between the query completing and the subscription.
      // Events that arrive during the flush are buffered and deduped below.
      const liveMsgBuffer: ChatMsg[] = [];
      const liveActivityBuffer: ActivityItem[] = [];
      let flushed = false;

      const onMessage = (msg: ChatMsg) => {
        if (flushed) {
          send(msg);
        } else {
          liveMsgBuffer.push(msg);
        }
      };

      const onActivity = (item: ActivityItem) => {
        if (flushed) {
          sendActivity(item);
        } else {
          liveActivityBuffer.push(item);
        }
      };

      chatBus.on("message", onMessage);
      chatBus.on("activity", onActivity);

      // Flush missed messages since last known id
      const seenIds = new Set<number>();
      // For activity gap-fill, track seen entries by stringified content to avoid dupes
      const seenActivityKeys = new Set<string>();

      try {
        await connectMongo();

        // Gap-fill chat messages from ChatMessage collection (no cap, infinite history)
        const missed = await ChatMessage.find({ workspaceId: "main", id: { $gt: since } })
          .sort({ id: 1 })
          .limit(200)
          .lean();
        for (const m of missed) {
          seenIds.add(m.id as number);
          send(m as ChatMsg);
        }

        // Gap-fill activity entries newer than sinceActivity from PipelineState
        if (sinceActivity !== null) {
          const sinceTime = parseInt(sinceActivity, 10);
          const BELL_TYPES = new Set(["claim", "create", "request", "comment", "status", "active"]);
          const doc = await PipelineState.findOne(WORKSPACE).lean() as {
            state?: {
              activityLog?: ActivityItem[];
            }
          } | null;
          const activityLog = doc?.state?.activityLog ?? [];
          const missedActivity = activityLog.filter(
            (a) => BELL_TYPES.has(a.type) && a.time > sinceTime
          );
          // activityLog is stored newest-first, so reverse to send oldest-first
          for (const a of [...missedActivity].reverse()) {
            const key = `${a.type}:${a.user}:${a.target}:${a.time}`;
            seenActivityKeys.add(key);
            sendActivity(a);
          }
        }
      } catch {
        // MongoDB unavailable in local dev — continue without historical messages
      }

      // Replay live events buffered during flush, deduped
      flushed = true;
      for (const m of liveMsgBuffer) {
        if (!seenIds.has(m.id)) {
          send(m);
        }
      }
      for (const a of liveActivityBuffer) {
        const key = `${a.type}:${a.user}:${a.target}:${a.time}`;
        if (!seenActivityKeys.has(key)) {
          sendActivity(a);
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
        chatBus.off("activity", onActivity);
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
