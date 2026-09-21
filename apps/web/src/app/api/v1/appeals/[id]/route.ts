import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AppealService, AppealServiceError } from "@hostelhub/db";

const appealService = new AppealService();

/**
 * GET /api/v1/appeals/[id] — Get appeal detail with explanation and SLA info
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const role = session.user.activeRole || session.user.roles?.[0] || "student";
    const result = await appealService.getAppealWithExplanation(id, session.user.id, role);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppealServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error("[GET /api/v1/appeals/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
