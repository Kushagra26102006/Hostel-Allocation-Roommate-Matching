import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors";
import type { NotificationChannel, QuietHoursConfig } from "@hostelhub/domain";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiProblemError({
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required to view notification preferences",
      code: "UNAUTHORIZED",
    });
  }

  const institutionId = session.user.institution_id ?? "000000000000000000000001";
  const prefs = await NotificationService.getUserPreferences(session.user.id, institutionId);

  return NextResponse.json(prefs);
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiProblemError({
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required to update notification preferences",
      code: "UNAUTHORIZED",
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    channels?: Record<string, NotificationChannel[]> | undefined;
    quietHours?: Partial<QuietHoursConfig> | undefined;
    dailyDigest?: boolean | undefined;
  };

  const institutionId = session.user.institution_id ?? "000000000000000000000001";
  const updated = await NotificationService.updateUserPreferences(
    session.user.id,
    institutionId,
    body,
  );

  return NextResponse.json(updated);
}
