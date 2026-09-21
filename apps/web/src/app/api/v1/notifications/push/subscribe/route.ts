import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiProblemError({
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required to register push subscription",
      code: "UNAUTHORIZED",
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    endpoint?: string | undefined;
    keys?: { p256dh: string; auth: string } | undefined;
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    throw new ApiProblemError({
      status: 400,
      title: "Invalid Subscription",
      detail: "Push subscription must include endpoint and p256dh/auth keys",
      code: "VALIDATION_FAILED",
    });
  }

  const userAgent = req.headers.get("user-agent") ?? undefined;
  const doc = await NotificationService.savePushSubscription(session.user.id, {
    endpoint: body.endpoint,
    keys: body.keys,
    userAgent,
  });

  return NextResponse.json({ success: true, subscriptionId: doc._id });
}
