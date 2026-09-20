import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, PromotionService } from "@hostelhub/db";

const querySchema = z.object({
  hostel_id: z.string().min(1),
  draft_id: z.string().min(1),
});

export const GET = apiHandler(
  {
    permission: "hostel:review_own",
    query: querySchema,
    operationId: "reconcileHostelOccupancy",
    summary: "Reconcile room and hostel occupancy with independent recount from active assignments",
  },
  async ({ query }) => {
    await connectDb();

    const promotionService = new PromotionService();
    const report = await promotionService.reconcileHostelOccupancy(query.hostel_id, query.draft_id);

    return {
      success: true,
      report,
    };
  },
);
