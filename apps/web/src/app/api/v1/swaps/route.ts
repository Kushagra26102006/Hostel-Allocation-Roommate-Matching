import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SwapService, SwapServiceError, type SwapRequestStatus } from "@hostelhub/db";

const swapService = new SwapService();

/**
 * POST /api/v1/swaps — Student proposes a swap
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { counterpart_student_id } = body;

    if (!counterpart_student_id) {
      return NextResponse.json({ error: "counterpart_student_id is required." }, { status: 400 });
    }

    const result = await swapService.proposeSwap(
      session.user.id,
      counterpart_student_id,
      session.user.institution_id || "",
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SwapServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error("[POST /api/v1/swaps]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/v1/swaps — List swaps for the current student
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const result = await swapService.listSwaps(session.user.id, {
      ...(statusParam ? { status: statusParam as SwapRequestStatus } : {}),
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/v1/swaps]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
