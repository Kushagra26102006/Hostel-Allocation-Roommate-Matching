import { Types } from "mongoose";
import {
  AllocationDraftModel,
  AllocationAssignmentModel,
  OverrideModel,
  ApprovalRecordModel,
  BedModel,
  RoomModel,
  type AllocationDraftDocument,
  type AllocationAssignmentDocument,
  type OverrideDocument,
  type ApprovalRecordDocument,
} from "@hostelhub/db";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";
import { checkVersionConflict } from "../../common/middleware/concurrency.middleware.js";
import { paginateArray, type PaginatedResult } from "../../common/pagination/index.js";
import { eventBus } from "../../events/domain-events.js";

export interface AssignmentExplanation {
  assignmentId: Types.ObjectId;
  applicationId?: Types.ObjectId;
  studentId?: Types.ObjectId;
  bedId?: Types.ObjectId;
  score?: number;
  explanation?: string;
  explanationText?: string;
}

export interface OverrideResult {
  assignment: AllocationAssignmentDocument;
  override: OverrideDocument;
  draftVersion: number;
}

export interface ApproveDraftResult {
  draft: AllocationDraftDocument;
  approval: ApprovalRecordDocument;
}

export class ReviewService {
  public static async getDraftById(
    institutionId: string,
    draftId: string,
  ): Promise<AllocationDraftDocument> {
    const draft = await AllocationDraftModel.findOne({
      _id: new Types.ObjectId(draftId),
      institution_id: new Types.ObjectId(institutionId),
    }).lean<AllocationDraftDocument>();
    if (!draft) throw new NotFoundError("Draft not found", "DRAFT_NOT_FOUND");
    return draft;
  }

  public static async listDraftAssignments(
    institutionId: string,
    draftId: string,
    query: {
      hostelId?: string | undefined;
      studentId?: string | undefined;
      limit?: number | undefined;
      cursor?: string | undefined;
    },
  ): Promise<PaginatedResult<AllocationAssignmentDocument>> {
    const filter: Record<string, unknown> = {
      institution_id: new Types.ObjectId(institutionId),
      draft_id: new Types.ObjectId(draftId),
    };
    if (query.hostelId) filter.hostel_id = new Types.ObjectId(query.hostelId);
    if (query.studentId) filter.student_id = new Types.ObjectId(query.studentId);

    const assignments =
      await AllocationAssignmentModel.find(filter).lean<AllocationAssignmentDocument[]>();
    return paginateArray<AllocationAssignmentDocument>(
      assignments,
      query.limit ?? 50,
      query.cursor,
    );
  }

  public static async getAssignmentExplanation(
    institutionId: string,
    assignmentId: string,
    userRole: string,
  ): Promise<AssignmentExplanation> {
    const assignment = await AllocationAssignmentModel.findOne({
      _id: new Types.ObjectId(assignmentId),
      institution_id: new Types.ObjectId(institutionId),
    }).lean<AllocationAssignmentDocument>();
    if (!assignment) throw new NotFoundError("Assignment not found", "ASSIGNMENT_NOT_FOUND");

    if (userRole === "student") {
      return {
        assignmentId: assignment._id,
        explanationText:
          assignment.explanation ||
          "Assigned based on your preferences, eligibility, and room capacity.",
      };
    }

    return {
      assignmentId: assignment._id,
      applicationId: assignment.application_id,
      studentId: assignment.student_id,
      bedId: assignment.bed_id,
      score: assignment.score,
      explanation: assignment.explanation,
    };
  }

  public static async applyOverride(
    institutionId: string,
    draftId: string,
    params: {
      assignmentId: string;
      newBedId: string;
      reason: string;
      expectedVersion?: number;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<OverrideResult> {
    if (!params.reason || params.reason.trim().length < 10) {
      throw new BadRequestError(
        "A valid override reason of at least 10 characters is required",
        "REASON_REQUIRED",
      );
    }

    const instId = new Types.ObjectId(institutionId);
    const draftObjectId = new Types.ObjectId(draftId);
    const assignmentObjectId = new Types.ObjectId(params.assignmentId);
    const newBedObjectId = new Types.ObjectId(params.newBedId);

    const draft = await AllocationDraftModel.findOne({
      _id: draftObjectId,
      institution_id: instId,
    });
    if (!draft) throw new NotFoundError("Draft not found", "DRAFT_NOT_FOUND");

    if (draft.status === "PUBLISHED" || draft.status === "published") {
      throw new ForbiddenError(
        "Cannot override an already published allocation",
        "DRAFT_ALREADY_PUBLISHED",
      );
    }

    checkVersionConflict(draft.version_number ?? 1, params.expectedVersion);

    const assignment = await AllocationAssignmentModel.findOne({
      _id: assignmentObjectId,
      draft_id: draftObjectId,
      institution_id: instId,
    });
    if (!assignment) throw new NotFoundError("Assignment not found", "ASSIGNMENT_NOT_FOUND");

    const newBed = await BedModel.findOne({ _id: newBedObjectId, institution_id: instId });
    if (!newBed) throw new NotFoundError("Target bed not found", "BED_NOT_FOUND");

    const previousBedId = assignment.bed_id;

    // Check if new bed is already assigned in this draft
    const alreadyAssigned = await AllocationAssignmentModel.findOne({
      draft_id: draftObjectId,
      bed_id: newBedObjectId,
      _id: { $ne: assignment._id },
    });
    if (alreadyAssigned) {
      throw new ConflictError(
        "Target bed is already assigned to another student in this draft",
        "BED_ALREADY_ASSIGNED",
      );
    }

    const newRoom = await RoomModel.findById(newBed.room_id);

    assignment.bed_id = newBed._id;
    assignment.room_id = newBed.room_id;
    if (newRoom) {
      assignment.hostel_id = newRoom.hostel_id;
    }
    await assignment.save();

    const override = await OverrideModel.create({
      institution_id: instId,
      draft_id: draftObjectId,
      assignment_id: assignment._id,
      application_id: assignment.application_id,
      from_bed_id: previousBedId,
      to_bed_id: newBedObjectId,
      reason: params.reason,
      actor: {
        id: actor.userId,
        role: actor.role,
        email: actor.email,
      },
      escalated: false,
    });

    draft.version_number = (draft.version_number ?? 1) + 1;
    await draft.save();

    await AuditService.record({
      institutionId,
      actor,
      action: "draft.override",
      target: { resourceType: "AllocationAssignment", resourceId: assignment._id.toString() },
      before: { bedId: previousBedId.toString() },
      after: { bedId: params.newBedId, reason: params.reason },
    });

    return { assignment, override, draftVersion: draft.version_number };
  }

  public static async submitForReview(
    institutionId: string,
    draftId: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<AllocationDraftDocument> {
    const draft = await AllocationDraftModel.findOne({
      _id: new Types.ObjectId(draftId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!draft) throw new NotFoundError("Draft not found", "DRAFT_NOT_FOUND");

    draft.status = "UNDER_REVIEW";
    await draft.save();

    await AuditService.record({
      institutionId,
      actor,
      action: "draft.submit_for_review",
      target: { resourceType: "AllocationDraft", resourceId: draft._id.toString() },
      after: { status: "UNDER_REVIEW" },
    });

    return draft;
  }

  public static async approveDraft(
    institutionId: string,
    draftId: string,
    notes: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<ApproveDraftResult> {
    const instId = new Types.ObjectId(institutionId);
    const draftObjectId = new Types.ObjectId(draftId);

    const draft = await AllocationDraftModel.findOne({
      _id: draftObjectId,
      institution_id: instId,
    });
    if (!draft) throw new NotFoundError("Draft not found", "DRAFT_NOT_FOUND");

    const approval = await ApprovalRecordModel.create({
      institution_id: instId,
      draft_id: draftObjectId,
      approver: {
        id: actor.userId,
        email: actor.email,
        role: actor.role,
      },
      comment: notes,
      approved_at: new Date(),
    });

    draft.status = "APPROVED";
    draft.approval_id = approval._id.toString();
    await draft.save();

    eventBus.publish({
      type: "draft.approved",
      institutionId,
      timestamp: new Date(),
      payload: { draftId, approvedBy: actor.userId },
      actor,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "draft.approve",
      target: { resourceType: "AllocationDraft", resourceId: draft._id.toString() },
      after: { status: "APPROVED", approvalId: approval._id.toString() },
    });

    return { draft, approval };
  }

  public static async requestChanges(
    institutionId: string,
    draftId: string,
    notes: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<AllocationDraftDocument> {
    const draft = await AllocationDraftModel.findOne({
      _id: new Types.ObjectId(draftId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!draft) throw new NotFoundError("Draft not found", "DRAFT_NOT_FOUND");

    draft.status = "CHANGES_REQUESTED";
    await draft.save();

    eventBus.publish({
      type: "draft.changes_requested",
      institutionId,
      timestamp: new Date(),
      payload: { draftId, notes },
      actor,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "draft.request_changes",
      target: { resourceType: "AllocationDraft", resourceId: draft._id.toString() },
      after: { status: "CHANGES_REQUESTED", notes },
    });

    return draft;
  }
}
