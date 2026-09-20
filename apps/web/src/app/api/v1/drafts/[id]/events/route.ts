import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@hostelhub/shared";
import { createRedisSubscriber } from "@/lib/queue/allocation-queue.js";
import {
  getDraftEventChannel,
  getDraftPresenceKey,
  type DraftEvent,
  type ReviewerPresence,
} from "@/lib/queue/draft-events.js";
import { getRedis } from "@/lib/redis.js";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: draftId } = await params;

  // 1. Authenticate & authorize
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRoles = session.user.roles ?? ["student"];
  const canReview = userRoles.some((role) => hasPermission(role, "hostel:review_own"));

  if (!canReview) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  // 2. Set up SSE stream
  const encoder = new TextEncoder();
  let subscriber: ReturnType<typeof createRedisSubscriber> | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let isStreamClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: DraftEvent) => {
        if (isStreamClosed) return;
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // stream might be closed
        }
      };

      // Send initial presence snapshot
      try {
        const redis = getRedis();
        if (redis) {
          const all = await redis.hgetall(getDraftPresenceKey(draftId));
          const reviewers: ReviewerPresence[] = Object.values(all)
            .map((v) => {
              try {
                return JSON.parse(v) as ReviewerPresence;
              } catch {
                return null;
              }
            })
            .filter((r): r is ReviewerPresence => r !== null);

          sendEvent({
            type: "presence",
            draftId,
            data: { reviewers },
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        // Continue
      }

      // Subscribe to Redis events channel
      try {
        subscriber = createRedisSubscriber();
        if (subscriber) {
          const channel = getDraftEventChannel(draftId);
          await subscriber.subscribe(channel);

          subscriber.on("message", (_chan: string, msg: string) => {
            try {
              const parsed = JSON.parse(msg) as DraftEvent;
              sendEvent(parsed);
            } catch {
              // ignore unparseable
            }
          });
        }
      } catch {
        // Fallback gracefully without redis
      }

      // Heartbeat comment every 15 seconds to keep HTTP stream active
      heartbeatTimer = setInterval(() => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          // Closed
        }
      }, 15000);
    },

    async cancel() {
      isStreamClosed = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (subscriber) {
        try {
          await subscriber.unsubscribe();
          await subscriber.quit();
        } catch {
          // ignore cleanup errors
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
