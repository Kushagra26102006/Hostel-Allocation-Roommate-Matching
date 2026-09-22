import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, PaymentService } from "@hostelhub/db";

const querySchema = z.object({
  policy: z.enum(["warning", "hold"]).default("warning"),
});

export const GET = apiHandler(
  {
    permission: "payment:own",
    query: querySchema,
    operationId: "getPaymentSummary",
    summary: "Get student payment status, balance due in paise, and policy flag",
  },
  async ({ user, institution_id, query }) => {
    await connectDb();

    const service = new PaymentService(institution_id);
    const summary = await service.getStudentPaymentSummary(user!.id, query.policy);

    return {
      test_mode: true,
      summary,
    };
  },
);
