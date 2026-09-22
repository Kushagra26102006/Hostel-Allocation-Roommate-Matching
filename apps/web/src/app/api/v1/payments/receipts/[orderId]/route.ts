import { type NextRequest, NextResponse } from "next/server";
import { connectDb, PaymentService } from "@hostelhub/db";
import { auth } from "@/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    const institutionId = session.user.institution_id || "000000000000000000000001";
    const service = new PaymentService(institutionId);

    const { pdfBuffer, filename } = await service.generateReceiptPdf(orderId);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Test-Mode": "true",
      },
    });
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; message?: string; code?: string } | undefined;
    const statusCode = errorObj?.statusCode || 400;
    return NextResponse.json(
      {
        error: errorObj?.message || "Failed to generate receipt PDF",
        code: errorObj?.code || "RECEIPT_ERROR",
        test_mode: true,
      },
      { status: statusCode },
    );
  }
}
