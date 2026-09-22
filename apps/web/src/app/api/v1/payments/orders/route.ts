import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, PaymentService, PaymentOrderModel } from "@hostelhub/db";
import type { WorkflowRole } from "@hostelhub/domain";

const createOrderSchema = z.object({
  fee_type: z.enum([
    "hostel_rent",
    "mess_fee",
    "caution_deposit",
    "full_semester",
    "fine_or_damage",
  ]),
  amount_paise: z.number().int().positive("Amount must be a positive integer in paise"),
  description: z.string().optional(),
  assignment_id: z.string().optional(),
  draft_id: z.string().optional(),
  hostel_id: z.string().optional(),
  notes: z.record(z.string()).optional(),
});

export const POST = apiHandler(
  {
    permission: "payment:own",
    body: createOrderSchema,
    operationId: "createPaymentOrder",
    summary: "Create a sandbox payment order stored in paise",
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

    const { order, gatewayOrder } = await service.createPaymentOrder(
      user!.id,
      {
        feeType: body.fee_type,
        amountPaise: body.amount_paise,
        description: body.description,
        assignmentId: body.assignment_id,
        draftId: body.draft_id,
        hostelId: body.hostel_id,
        notes: body.notes,
      },
      actor,
    );

    return {
      success: true,
      test_mode: true,
      order: {
        id: order._id.toString(),
        order_id: order.order_id,
        amount_paise: order.amount_paise,
        amount_inr: (order.amount_paise / 100).toFixed(2),
        currency: order.currency,
        fee_type: order.fee_type,
        description: order.description,
        status: order.status,
        receipt_number: order.receipt_number,
      },
      gateway_order: gatewayOrder,
    };
  },
);

export const GET = apiHandler(
  {
    permission: "payment:own",
    operationId: "listPaymentOrders",
    summary: "List payment orders for the authenticated student",
  },
  async ({ user, institution_id }) => {
    await connectDb();

    const orders = await PaymentOrderModel.find({
      institution_id,
      student_id: user!.id,
    }).sort({ createdAt: -1 });

    return {
      test_mode: true,
      orders: orders.map((o) => ({
        id: o._id.toString(),
        order_id: o.order_id,
        payment_id: o.payment_id,
        amount_paise: o.amount_paise,
        amount_inr: (o.amount_paise / 100).toFixed(2),
        currency: o.currency,
        fee_type: o.fee_type,
        description: o.description,
        status: o.status,
        receipt_number: o.receipt_number,
        paid_at: o.paid_at?.toISOString(),
        created_at: o.createdAt.toISOString(),
      })),
    };
  },
);
