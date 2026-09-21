import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SwapService, SwapServiceError } from "@hostelhub/db";

const swapService = new SwapService();

/**
 * POST /api/v1/swaps/[id]/cancel — Either party cancels the swap
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await swapService.cancelSwap(
      id,
      session.user.id,
      session.user.institution_id || "",
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SwapServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error("[POST /api/v1/swaps/:id/cancel]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
