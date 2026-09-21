import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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

  const { id } = await params;
  const retried = await NotificationService.retryDlqEntry(id);

  if (!retried) {
    throw new ApiProblemError({
      status: 404,
      title: "Not Found",
      detail: "Dead-letter entry not found or already processed",
      code: "NOT_FOUND",
    });
  }

  return NextResponse.json({ success: true, entry: retried });
}
