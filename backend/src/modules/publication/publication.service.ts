import { Types } from "mongoose";
import {
  AllocationDraftModel,
  AllocationAssignmentModel,
  ApprovalRecordModel,
  BedModel,
  AllocationCycleModel,
  type AllocationDraftDocument,
} from "@hostelhub/db";
import { NotFoundError, ForbiddenError } from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";
import { createLettersQueue } from "../../workers/letters.worker.js";
import { eventBus } from "../../events/domain-events.js";

export interface PublishDraftResult {
  success: boolean;
  draft: AllocationDraftDocument;
  assignmentsCount: number;
}

export class PublicationService {
  public static async publishDraft(
    institutionId: string,
    draftId: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<PublishDraftResult> {
    const instId = new Types.ObjectId(institutionId);
    const draftObjectId = new Types.ObjectId(draftId);

    const draft = await AllocationDraftModel.findOne({
      _id: draftObjectId,
      institution_id: instId,
    });
    if (!draft) throw new NotFoundError("Draft not found", "DRAFT_NOT_FOUND");

    if (draft.status !== "APPROVED") {
      throw new ForbiddenError(
        `Draft cannot be published without formal approval. Current status: '${draft.status}'`,
        "APPROVAL_REQUIRED",
      );
    }

    const approval = await ApprovalRecordModel.findOne({
      draft_id: draftObjectId,
      institution_id: instId,
    });
    if (!approval) {
      throw new ForbiddenError(
        "No approval record found for this draft",
        "APPROVAL_RECORD_MISSING",
      );
    }

    // 1. Mark draft published
    draft.status = "PUBLISHED";
    draft.published_at = new Date();
    await draft.save();

    // 2. Mark cycle status closed/published
    await AllocationCycleModel.findByIdAndUpdate(draft.cycle_id, { status: "closed" });

    // 3. Mark all assigned beds as 'allocated'
    const assignments = await AllocationAssignmentModel.find({
      draft_id: draftObjectId,
      institution_id: instId,
    });
    const bedIds = assignments.map((a) => a.bed_id);
    await BedModel.updateMany({ _id: { $in: bedIds } }, { status: "allocated" });

    // 4. Enqueue PDF letters generation
    const lettersQueue = createLettersQueue();
    for (const assignment of assignments) {
      await lettersQueue.add(`letter-${assignment._id}`, {
        assignmentId: assignment._id.toString(),
        institutionId,
        cycleId: draft.cycle_id.toString(),
      });
    }

    eventBus.publish({
      type: "allocation.published",
      institutionId,
      timestamp: new Date(),
      payload: {
        draftId,
        cycleId: draft.cycle_id.toString(),
        assignmentsCount: assignments.length,
      },
      actor,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "draft.publish",
      target: { resourceType: "AllocationDraft", resourceId: draft._id.toString() },
      after: { status: "PUBLISHED", publishedAt: draft.published_at },
    });

    return { success: true, draft, assignmentsCount: assignments.length };
  }
}
