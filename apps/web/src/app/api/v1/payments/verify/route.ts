import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, PaymentService } from "@hostelhub/db";
import type { WorkflowRole } from "@hostelhub/domain";

const verifyPaymentSchema = z.object({
  order_id: z.string().min(1, "Order ID is required"),
  payment_id: z.string().min(1, "Payment ID is required"),
  signature: z.string().min(1, "Signature is required"),
  method: z.string().optional(),
});

export const POST = apiHandler(
  {
    permission: "payment:own",
    body: verifyPaymentSchema,
    operationId: "verifyPayment",
    summary: "Verify Razorpay test signature and mark order paid",
  },
  async ({ user, institution_id, body }) => {
    await connectDb();

    const service = new PaymentService(institution_id);
    const actor = {
      id: user!.id,
      email: user!.email,
      role: (user!.roles[0] || "student") as WorkflowRole,
      name: user!.name,
    };

    const { order, receiptUrl } = await service.verifyAndRecordPayment(
      {
        orderId: body.order_id,
        paymentId: body.payment_id,
        signature: body.signature,
        method: body.method,
      },
      actor,
    );

    return {
      success: true,
      test_mode: true,
      order: {
        id: order._id.toString(),
        order_id: order.order_id,
        payment_id: order.payment_id,
        amount_paise: order.amount_paise,
        amount_inr: (order.amount_paise / 100).toFixed(2),
        status: order.status,
        receipt_number: order.receipt_number,
        paid_at: order.paid_at?.toISOString(),
      },
      receipt_url: receiptUrl,
    };
  },
);
