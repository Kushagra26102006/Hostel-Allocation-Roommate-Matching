import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, PaymentService } from "@hostelhub/db";
import type { WorkflowRole } from "@hostelhub/domain";

const refundAccountInputSchema = z.object({
  account_holder_name: z.string().min(1, "Account holder name is required"),
  account_number: z
    .string()
    .min(8, "Account number must be 8-20 digits")
    .max(20, "Account number must be 8-20 digits")
    .regex(/^\d+$/, "Account number must contain only numeric digits"),
  ifsc_code: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Invalid IFSC code format (e.g. SBIN0000691)"),
  bank_name: z.string().optional(),
  branch_name: z.string().optional(),
});

export const GET = apiHandler(
  {
    permission: "payment:own",
    operationId: "getRefundAccount",
    summary: "Get masked refund bank account details for current student",
  },
  async ({ user, institution_id }) => {
    await connectDb();

    const service = new PaymentService(institution_id);
    const account = await service.getRefundAccount(user!.id);

    return {
      test_mode: true,
      has_refund_account: !!account,
      refund_account: account,
    };
  },
);

export const POST = apiHandler(
  {
    permission: "payment:own",
    body: refundAccountInputSchema,
    operationId: "saveRefundAccount",
    summary: "Save encrypted refund bank account details with IFSC verification",
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

    const saved = await service.saveRefundAccount(
      user!.id,
      {
        accountHolderName: body.account_holder_name,
        accountNumber: body.account_number,
        ifscCode: body.ifsc_code.toUpperCase(),
        bankName: body.bank_name,
        branchName: body.branch_name,
      },
      actor,
    );

    return {
      success: true,
      test_mode: true,
      encrypted_storage: "AES-256-GCM",
      refund_account: saved,
    };
  },
);
