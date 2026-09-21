import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiProblemError({
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required to update notification",
      code: "UNAUTHORIZED",
    });
  }

  const { id } = await params;
  const updated = await NotificationService.markNotificationAsRead(id, session.user.id);

  if (!updated) {
    throw new ApiProblemError({
      status: 404,
      title: "Not Found",
      detail: "Notification not found or access denied",
      code: "NOT_FOUND",
    });
  }

  return NextResponse.json({ success: true, notification: updated });
}
