import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RoomChangeService, RoomChangeServiceError } from "@hostelhub/db";

const roomChangeService = new RoomChangeService();

/**
 * POST /api/v1/room-changes — Student creates a room change request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assignment_id, reason, evidence_keys = [] } = body;

    if (!assignment_id || !reason) {
      return NextResponse.json(
        { error: "assignment_id and reason are required." },
        { status: 400 },
      );
    }

    const result = await roomChangeService.createRequest(
      session.user.id,
      assignment_id,
      reason,
      evidence_keys,
      session.user.institution_id || "",
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof RoomChangeServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error("[POST /api/v1/room-changes]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/v1/room-changes — List room change requests (role-scoped)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = session.user.activeRole || session.user.roles?.[0] || "student";

    const result = await roomChangeService.listRequests(
      {
        ...(role === "student" ? { studentId: session.user.id } : {}),
        ...(searchParams.get("draft_id") ? { draftId: searchParams.get("draft_id")! } : {}),
        ...(searchParams.get("hostel_id") ? { hostelId: searchParams.get("hostel_id")! } : {}),
        ...(searchParams.get("status") ? { status: searchParams.get("status")! } : {}),
        page: Number(searchParams.get("page")) || 1,
        limit: Number(searchParams.get("limit")) || 20,
      },
      role,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/v1/room-changes]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
