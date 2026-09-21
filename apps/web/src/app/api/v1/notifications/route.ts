import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiProblemError({
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required to view notifications",
      code: "UNAUTHORIZED",
    });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const category = searchParams.get("category") ?? undefined;

  const result = await NotificationService.getUserNotifications(session.user.id, {
    page,
    limit,
    unreadOnly,
    category,
  });

  return NextResponse.json(result);
}
