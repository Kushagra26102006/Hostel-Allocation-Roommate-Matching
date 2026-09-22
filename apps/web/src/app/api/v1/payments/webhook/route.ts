import { type NextRequest, NextResponse } from "next/server";
import { connectDb, PaymentService, type WebhookEventPayload } from "@hostelhub/db";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    // Read signature header
    const signature =
      req.headers.get("x-razorpay-signature") || req.headers.get("x-signature") || "";

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature header (x-razorpay-signature)" },
        { status: 400 },
      );
    }

    const rawBody = await req.text();
    let eventPayload: WebhookEventPayload;
    try {
      eventPayload = JSON.parse(rawBody) as WebhookEventPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Default institutional context for test mode gateway webhook
    const institutionId =
      req.headers.get("x-institution-id") ||
      process.env.DEFAULT_INSTITUTION_ID ||
      "000000000000000000000001";

    const service = new PaymentService(institutionId);
    const result = await service.handleWebhook(rawBody, signature, eventPayload);

    return NextResponse.json({
      status: "ok",
      test_mode: true,
      result,
    });
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; message?: string; code?: string } | undefined;
    const statusCode = errorObj?.statusCode || 400;
    return NextResponse.json(
      {
        error: errorObj?.message || "Webhook processing failed",
        code: errorObj?.code || "WEBHOOK_ERROR",
        test_mode: true,
      },
      { status: statusCode },
    );
  }
}
