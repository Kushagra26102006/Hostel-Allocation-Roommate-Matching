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
      detail: "Authentication required",
      code: "UNAUTHORIZED",
    });
  }

  const roles = (session.user.roles ?? ["student"]) as string[];
  const isStaff = roles.some((r) =>
    ["admin", "sys_admin", "warden", "chief_warden", "dean"].includes(r),
  );
  if (!isStaff) {
    throw new ApiProblemError({
      status: 403,
      title: "Forbidden",
      detail: "Staff or administrator privileges required to access Dead-Letter Queue",
      code: "FORBIDDEN",
    });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const channel = searchParams.get("channel") ?? undefined;
  const eventType = searchParams.get("eventType") ?? undefined;

  const result = await NotificationService.getDlqEntries({
    page,
    limit,
    channel,
    eventType,
  });

  return NextResponse.json(result);
}
