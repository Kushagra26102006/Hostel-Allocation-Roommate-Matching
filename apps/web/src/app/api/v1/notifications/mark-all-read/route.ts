import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors";

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiProblemError({
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required to mark all notifications as read",
      code: "UNAUTHORIZED",
    });
  }

  const modifiedCount = await NotificationService.markAllNotificationsAsRead(session.user.id);
  return NextResponse.json({ success: true, modifiedCount });
}
