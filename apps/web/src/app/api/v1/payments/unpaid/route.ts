import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, PaymentService } from "@hostelhub/db";
import type { WorkflowRole } from "@hostelhub/domain";

const querySchema = z.object({
  hostel_id: z.string().min(1, "hostel_id is required"),
  policy: z.enum(["warning", "hold"]).default("warning"),
});

export const GET = apiHandler(
  {
    permission: "payment:manage",
    query: querySchema,
    operationId: "getUnpaidResidents",
    summary: "Get list of unpaid residents with warning/hold flag for wardens",
  },
  async ({ user, institution_id, query }) => {
    await connectDb();

    const service = new PaymentService(institution_id);
    const actor = {
      id: user!.id,
      email: user!.email,
      role: (user!.roles[0] || "warden") as WorkflowRole,
      name: user!.name,
    };

    const unpaidResidents = await service.getUnpaidResidents(actor, query.policy, query.hostel_id);

    return {
      test_mode: true,
      policy: query.policy,
      hostel_id: query.hostel_id,
      total_unpaid: unpaidResidents.length,
      unpaid_residents: unpaidResidents,
    };
  },
);
