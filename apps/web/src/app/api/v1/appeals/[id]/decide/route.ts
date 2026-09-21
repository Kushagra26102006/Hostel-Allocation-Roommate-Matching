import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AppealService, AppealServiceError } from "@hostelhub/db";
import type { AppealOutcome } from "@hostelhub/domain";

const appealService = new AppealService();

/**
 * POST /api/v1/appeals/[id]/decide — Warden/Chief Warden decides on an appeal
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.activeRole || session.user.roles?.[0] || "student";
    if (role === "student") {
      return NextResponse.json({ error: "Only staff can decide appeals." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { outcome, reason } = body;

    if (!outcome || !reason) {
      return NextResponse.json({ error: "outcome and reason are required." }, { status: 400 });
    }

    const validOutcomes: AppealOutcome[] = ["upheld", "partly_upheld", "rejected"];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: "outcome must be 'upheld', 'partly_upheld', or 'rejected'." },
        { status: 400 },
      );
    }

    const result = await appealService.decideAppeal(
      id,
      outcome,
      reason,
      {
        id: session.user.id,
        email: session.user.email || "",
        role: role as "warden" | "chief_warden" | "admin",
      },
      session.user.institution_id || "",
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppealServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error("[POST /api/v1/appeals/:id/decide]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
