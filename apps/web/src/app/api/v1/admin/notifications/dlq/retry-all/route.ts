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
      detail: "Staff or administrator privileges required to retry Dead-Letter Queue items",
      code: "FORBIDDEN",
    });
  }

  const modifiedCount = await NotificationService.retryAllDlq();
  return NextResponse.json({ success: true, retriedCount: modifiedCount });
}
