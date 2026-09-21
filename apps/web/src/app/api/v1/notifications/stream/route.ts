import { type NextRequest } from "next/server";
import { auth } from "@/auth";
import { Redis } from "ioredis";
import { getUserNotificationChannel, getWebEnv } from "@hostelhub/shared";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const channel = getUserNotificationChannel(userId);
  const env = getWebEnv();

  const subscriber = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await subscriber.connect();
        await subscriber.subscribe(channel);

        // Initial heartbeat
        controller.enqueue(encoder.encode(`: connected\n\n`));

        subscriber.on("message", (msgChannel, message) => {
          if (msgChannel === channel) {
            controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          }
        });

        // Periodic heartbeat ping every 25s to keep connection open through proxies
        const interval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            clearInterval(interval);
          }
        }, 25000);

        req.signal.addEventListener("abort", () => {
          clearInterval(interval);
          subscriber.unsubscribe(channel).catch(() => {});
          subscriber.quit().catch(() => {});
          controller.close();
        });
      } catch (err) {
        controller.error(err);
        subscriber.quit().catch(() => {});
      }
    },
    cancel() {
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
