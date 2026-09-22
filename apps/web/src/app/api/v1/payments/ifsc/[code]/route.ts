import { type NextRequest, NextResponse } from "next/server";
import { RazorpayTestAdapter } from "@hostelhub/domain";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode?.trim().toUpperCase();

    if (!code || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      return NextResponse.json(
        {
          error: "Invalid IFSC code format (e.g. SBIN0000691)",
          code: "INVALID_IFSC_FORMAT",
        },
        { status: 400 },
      );
    }

    const adapter = new RazorpayTestAdapter();
    const details = await adapter.fetchIFSCDetails(code);

    if (!details) {
      return NextResponse.json(
        {
          error: `Bank details could not be found for IFSC ${code}`,
          code: "IFSC_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      test_mode: true,
      details: {
        ifsc: details.ifsc,
        bank: details.bank,
        branch: details.branch,
        city: details.city,
        state: details.state,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to resolve IFSC";
    return NextResponse.json(
      {
        error: message,
        code: "IFSC_LOOKUP_ERROR",
      },
      { status: 500 },
    );
  }
}
