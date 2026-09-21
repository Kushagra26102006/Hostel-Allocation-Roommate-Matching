import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RoomChangeService, RoomChangeServiceError } from "@hostelhub/db";

const roomChangeService = new RoomChangeService();

/**
 * POST /api/v1/room-changes/[id]/decide — Warden approves/rejects
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.activeRole || session.user.roles?.[0] || "student";
    if (role === "student") {
      return NextResponse.json(
        { error: "Only staff can decide room change requests." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { decision, reason, target_bed_id } = body;

    if (!decision || !reason) {
      return NextResponse.json({ error: "decision and reason are required." }, { status: 400 });
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { error: "decision must be 'approved' or 'rejected'." },
        { status: 400 },
      );
    }

    const result = await roomChangeService.decideRequest(
      id,
      decision,
      {
        id: session.user.id,
        email: session.user.email || "",
        role: role as "warden" | "chief_warden" | "admin",
      },
      reason,
      target_bed_id,
      session.user.institution_id || "",
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RoomChangeServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error("[POST /api/v1/room-changes/:id/decide]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
