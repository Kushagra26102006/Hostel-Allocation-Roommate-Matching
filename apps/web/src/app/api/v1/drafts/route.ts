/* eslint-disable no-restricted-imports */
import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import {
  connectDb,
  AllocationDraftModel,
  AllocationCycleModel,
  OverrideModel,
  AllocationRunModel,
} from "@hostelhub/db";

const querySchema = z.object({
  cycleId: z.string().optional(),
  status: z.string().optional(),
});

export const GET = apiHandler(
  {
    permission: "hostel:review_own",
    query: querySchema,
    operationId: "listAllocationDrafts",
    summary: "List allocation drafts for the warden review queue with SLA status and metrics",
  },
  async ({ institution_id, query }) => {
    await connectDb();

    const filter: Record<string, unknown> = {
      institution_id: new Types.ObjectId(institution_id),
    };

    if (query.cycleId) {
      filter.cycle_id = new Types.ObjectId(query.cycleId);
    }
    if (query.status) {
      filter.status = query.status;
    }

    const drafts = await AllocationDraftModel.find(filter).sort({ createdAt: -1 }).lean().exec();

    const items = await Promise.all(
      drafts.map(async (d) => {
        const [cycle, run, overridesCount] = await Promise.all([
          AllocationCycleModel.findById(d.cycle_id).select("name academic_year").lean().exec(),
          AllocationRunModel.findById(d.run_id).select("engine_version completed_at").lean().exec(),
          OverrideModel.countDocuments({ draft_id: d._id }),
        ]);

        // 48-hour SLA deadline from draft creation
        const createdAtDate = d.createdAt ? new Date(d.createdAt) : new Date();
        const slaDeadline = new Date(createdAtDate.getTime() + 48 * 60 * 60 * 1000);
        const msRemaining = slaDeadline.getTime() - Date.now();
        const hoursRemaining = Math.round(msRemaining / (1000 * 60 * 60));
        const isOverdue = msRemaining < 0 && d.status === "UNDER_REVIEW";

        return {
          id: d._id.toString(),
          cycleId: d.cycle_id.toString(),
          cycleName: cycle ? `${cycle.name} (${cycle.academic_year})` : "Current Cycle",
          runId: d.run_id.toString(),
          engineVersion: run?.engine_version ?? "v2.0.0",
          status: d.status,
          versionNumber: d.version_number,
          approvalId: d.approval_id ?? null,
          publishedAt: d.published_at ?? null,
          metrics: d.metrics ?? null,
          overridesCount,
          sla: {
            deadline: slaDeadline.toISOString(),
            hoursRemaining,
            isOverdue,
            status: isOverdue ? "overdue" : hoursRemaining < 12 ? "urgent" : "normal",
          },
          createdAt: d.createdAt,
        };
      }),
    );

    return { drafts: items };
  },
);
