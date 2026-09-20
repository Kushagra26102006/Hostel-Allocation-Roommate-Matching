/* eslint-disable no-restricted-imports */
import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiProblemError } from "@/lib/api/errors.js";
import {
  connectDb,
  AllocationDraftModel,
  AllocationCycleModel,
  AllocationRunModel,
  ApprovalRecordModel,
  OverrideModel,
  AllocationAssignmentModel,
  WaitlistEntryModel,
} from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export const GET = apiHandler(
  {
    permission: "hostel:review_own",
    params: paramsSchema,
    operationId: "getAllocationDraft",
    summary: "Get allocation draft details, status, approvals, overrides summary, and metrics",
  },
  async ({ params, institution_id }) => {
    await connectDb();

    const draftId = new Types.ObjectId(params.id);
    const instId = new Types.ObjectId(institution_id);

    const draft = await AllocationDraftModel.findOne({
      _id: draftId,
      institution_id: instId,
    })
      .lean()
      .exec();

    if (!draft) {
      throw new ApiProblemError({
        status: 404,
        title: "Not Found",
        detail: "Allocation draft not found",
        code: "NOT_FOUND",
      });
    }

    const [cycle, run, approvalRecord, overrides, totalAssignments, waitlistCount] =
      await Promise.all([
        AllocationCycleModel.findById(draft.cycle_id).select("name academic_year").lean().exec(),
        AllocationRunModel.findById(draft.run_id).lean().exec(),
        draft.approval_id ? ApprovalRecordModel.findById(draft.approval_id).lean().exec() : null,
        OverrideModel.find({ draft_id: draft._id }).lean().exec(),
        AllocationAssignmentModel.countDocuments({ draft_id: draft._id }),
        WaitlistEntryModel.countDocuments({ draft_id: draft._id }),
      ]);

    const escalatedOverridesCount = overrides.filter((o) => o.escalated).length;
    const overridesWithoutReason = overrides.filter(
      (o) => !o.reason || o.reason.trim().length < 10,
    ).length;

    // SLA
    const createdAtDate = draft.createdAt ? new Date(draft.createdAt) : new Date();
    const slaDeadline = new Date(createdAtDate.getTime() + 48 * 60 * 60 * 1000);
    const msRemaining = slaDeadline.getTime() - Date.now();
    const hoursRemaining = Math.round(msRemaining / (1000 * 60 * 60));
    const isOverdue = msRemaining < 0 && draft.status === "UNDER_REVIEW";

    return {
      draft: {
        id: draft._id.toString(),
        cycleId: draft.cycle_id.toString(),
        cycleName: cycle ? `${cycle.name} (${cycle.academic_year})` : "Active Cycle",
        runId: draft.run_id.toString(),
        status: draft.status,
        versionNumber: draft.version_number,
        inputHash: draft.input_hash,
        seed: draft.seed,
        metrics: draft.metrics ?? run?.metrics ?? null,
        publishedAt: draft.published_at ?? null,
        approval: approvalRecord
          ? {
              id: approvalRecord._id.toString(),
              approver: approvalRecord.approver,
              secondApprover: approvalRecord.second_approver ?? null,
              comment: approvalRecord.comment,
              approvedAt: approvalRecord.approved_at,
            }
          : null,
        overridesSummary: {
          total: overrides.length,
          escalated: escalatedOverridesCount,
          missingReasons: overridesWithoutReason,
          items: overrides.map((o) => ({
            id: o._id.toString(),
            assignmentId: o.assignment_id.toString(),
            actor: o.actor,
            fromBedId: o.from_bed_id.toString(),
            toBedId: o.to_bed_id.toString(),
            reason: o.reason,
            escalated: o.escalated,
            escalationReasons: o.escalation_reasons ?? [],
            createdAt: o.createdAt,
          })),
        },
        counts: {
          totalAssignments,
          waitlistCount,
        },
        sla: {
          deadline: slaDeadline.toISOString(),
          hoursRemaining,
          isOverdue,
          status: isOverdue ? "overdue" : hoursRemaining < 12 ? "urgent" : "normal",
        },
        createdAt: draft.createdAt,
      },
    };
  },
);
