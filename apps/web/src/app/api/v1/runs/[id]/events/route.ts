import { type NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDb, AllocationRunModel } from "@hostelhub/db";
import {
  getAllocationEventChannel,
  hasPermission,
  type AllocationProgressEvent,
  type AllocationStageCode,
} from "@hostelhub/shared";
import { createRedisSubscriber } from "@/lib/queue/allocation-queue.js";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: runId } = await params;

  // 1. Authenticate & authorize
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRoles = session.user.roles ?? ["student"];
  const canRunAllocation = userRoles.some((role) => hasPermission(role, "allocation:run"));

  if (!canRunAllocation) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  await connectDb();
  const instId = new Types.ObjectId(session.user.institution_id);
  const runObjId = new Types.ObjectId(runId);

  const initialRun = await AllocationRunModel.findOne({
    _id: runObjId,
    institution_id: instId,
  })
    .lean()
    .exec();

  if (!initialRun) {
    return NextResponse.json({ error: "Allocation run not found" }, { status: 404 });
  }

  // 2. Set up SSE ReadableStream
  const encoder = new TextEncoder();
  let subscriber: ReturnType<typeof createRedisSubscriber> | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let isStreamClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: AllocationProgressEvent) => {
        if (isStreamClosed) return;
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Controller might already be closed
        }
      };

      // Send initial snapshot of run
      const initialEvent: AllocationProgressEvent = {
        runId,
        stageCode: (initialRun.progress?.stage ?? "freeze") as AllocationStageCode,
        stageLabel: initialRun.progress?.stage ?? "Freeze",
        percent: initialRun.progress?.percent ?? (initialRun.status === "completed" ? 100 : 0),
        message: initialRun.progress?.message ?? `Run status: ${initialRun.status}`,
        metrics: initialRun.metrics,
        completed: initialRun.status === "completed",
        cancelled: initialRun.status === "cancelled",
        error: initialRun.error,
        timestamp: new Date().toISOString(),
      };
      sendEvent(initialEvent);

      // If already terminal, close stream immediately
      if (
        initialRun.status === "completed" ||
        initialRun.status === "failed" ||
        initialRun.status === "cancelled"
      ) {
        isStreamClosed = true;
        controller.close();
        return;
      }

      // Connect Redis subscriber
      try {
        subscriber = createRedisSubscriber();
        const channel = getAllocationEventChannel(runId);

        subscriber.on("message", (_chan, message) => {
          try {
            const parsed = JSON.parse(message) as AllocationProgressEvent;
            sendEvent(parsed);
            if (parsed.completed || parsed.cancelled || parsed.error) {
              cleanup();
            }
          } catch {
            // Ignore parse errors
          }
        });

        await subscriber.subscribe(channel);
      } catch {
        // Redis subscription failed; client will rely on initial state + polling fallback
      }

      // Keep-alive heartbeat every 15s
      heartbeatTimer = setInterval(() => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          cleanup();
        }
      }, 15000);

      const cleanup = () => {
        if (isStreamClosed) return;
        isStreamClosed = true;
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (subscriber) {
          subscriber.quit().catch(() => {});
          subscriber = null;
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      isStreamClosed = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (subscriber) subscriber.quit().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
