import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RoomChangeService, RoomChangeServiceError } from "@hostelhub/db";

const roomChangeService = new RoomChangeService();

/**
 * GET /api/v1/room-changes/[id] — Get single room change request
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const role = session.user.activeRole || session.user.roles?.[0] || "student";
    const result = await roomChangeService.getRequest(id, session.user.id, role);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RoomChangeServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error("[GET /api/v1/room-changes/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
