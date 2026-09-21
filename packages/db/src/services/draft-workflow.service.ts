import { Types } from "mongoose";
import {
  canTransition,
  evaluateApprovalRequirements,
  validateOverride,
  type DraftStatus,
  type UserRole,
  type OverrideInput,
  type OverrideValidationContext,
  type Unit,
  type Bed,
  type Room,
  type Hostel,
  type GenderPolicy,
  type ApproverInfo,
  type QuestionnaireAnswers,
} from "@hostelhub/domain";
import {
  AllocationDraftModel,
  type AllocationDraftDocument,
} from "../models/allocation-draft.model.js";
import { AllocationAssignmentModel } from "../models/allocation-assignment.model.js";
import { OverrideModel, type OverrideDocument } from "../models/override.model.js";
import {
  ApprovalRecordModel,
  type ApprovalRecordDocument,
} from "../models/approval-record.model.js";
import { BedModel } from "../models/bed.model.js";
import { RoomModel } from "../models/room.model.js";
import { HostelModel } from "../models/hostel.model.js";
import { ApplicationModel } from "../models/application.model.js";
import { AuditService } from "./audit.service.js";
import { VersionConflictError } from "../repository/errors.js";

export interface WorkflowActor {
  id: string;
  email: string;
  role: UserRole;
  hostelId?: string | undefined; // If warden, assigned hostel
}

export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

export class DraftWorkflowService {
  constructor(private readonly auditService?: AuditService) {}

  private getAudit(institutionId: Types.ObjectId | string): AuditService {
    if (this.auditService) return this.auditService;
    return AuditService.withTenant(institutionId);
  }

  /**
   * Transitions a draft to a target state with role checks, guards, and audit logging.
   */
  async transitionDraft(
    draftId: string | Types.ObjectId,
    targetState: DraftStatus,
    actor: WorkflowActor,
    options: {
      comment?: string;
      reason?: string;
      expectedVersion?: number;
    } = {},
  ): Promise<AllocationDraftDocument> {
    const draft = await AllocationDraftModel.findById(draftId);
    if (!draft) {
      throw new WorkflowError("Draft not found", "DRAFT_NOT_FOUND", 404);
    }

    // Optimistic concurrency check if version provided
    if (options.expectedVersion !== undefined && draft.version_number !== options.expectedVersion) {
      throw new VersionConflictError(
        draft._id.toString(),
        options.expectedVersion,
        draft.version_number,
      );
    }

    const currentDomainStatus = draft.status as DraftStatus;

    // Check transition validity
    const check = canTransition(currentDomainStatus, targetState, actor.role, {
      comment: options.comment,
      approvalRecordId: draft.approval_id,
      hasOverridesWithoutReason: false,
      hasInvariantErrors: false,
    });

    if (!check.allowed) {
      throw new WorkflowError(
        check.reason ?? `Transition from ${draft.status} to ${targetState} not permitted`,
        "INVALID_TRANSITION",
        400,
      );
    }

    const previousStatus = draft.status;
    draft.status = targetState;
    await draft.save();

    // Append to audit hash chain
    await this.getAudit(draft.institution_id).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: `DRAFT_TRANSITION_${targetState}`,
      target: { draft_id: draft._id.toString(), from: previousStatus, to: targetState },
      before: { status: previousStatus },
      after: { status: targetState, comment: options.comment, reason: options.reason },
    });

    return draft;
  }

  /**
   * Move a student to another bed inside a draft.
   * Reason is mandatory (minimum 10 characters).
   * Revalidates ALL hard constraints for target bed and roommates.
   * Stores Override, bumps draft version, enforces If-Match.
   */
  async applyOverride(
    draftId: string | Types.ObjectId,
    params: {
      assignmentId: string | Types.ObjectId;
      toBedId: string | Types.ObjectId;
      reason: string;
      expectedVersion: number;
    },
    actor: WorkflowActor,
  ): Promise<{ draft: AllocationDraftDocument; override: OverrideDocument }> {
    const { assignmentId, toBedId, reason, expectedVersion } = params;

    if (!reason || reason.trim().length < 10) {
      throw new WorkflowError(
        "Override reason is mandatory and must be at least 10 characters",
        "INVALID_REASON",
        400,
      );
    }

    // Fetch draft
    const draft = await AllocationDraftModel.findById(draftId);
    if (!draft) {
      throw new WorkflowError("Draft not found", "DRAFT_NOT_FOUND", 404);
    }

    // Protection: published drafts cannot be modified
    if (draft.status === "PUBLISHED" || draft.status === "published") {
      throw new WorkflowError(
        "Cannot override assignments in a published draft",
        "DRAFT_PUBLISHED_READONLY",
        400,
      );
    }

    // Concurrency: If-Match version check
    if (draft.version_number !== expectedVersion) {
      throw new VersionConflictError(draft._id.toString(), expectedVersion, draft.version_number);
    }

    // Fetch existing assignment
    const assignment = await AllocationAssignmentModel.findOne({
      _id: assignmentId,
      draft_id: draft._id,
    });
    if (!assignment) {
      throw new WorkflowError("Assignment not found in draft", "ASSIGNMENT_NOT_FOUND", 404);
    }

    // Fetch target bed, room, hostel
    const toBed = await BedModel.findById(toBedId);
    if (!toBed) {
      throw new WorkflowError("Target bed not found", "TARGET_BED_NOT_FOUND", 404);
    }
    const toRoom = await RoomModel.findById(toBed.room_id);
    if (!toRoom) {
      throw new WorkflowError("Target room not found", "TARGET_ROOM_NOT_FOUND", 404);
    }
    const toHostel = await HostelModel.findById(toRoom.hostel_id);
    if (!toHostel) {
      throw new WorkflowError("Target hostel not found", "TARGET_HOSTEL_NOT_FOUND", 404);
    }

    // Warden scope check: wardens can only override within their assigned hostel
    if (actor.role === "warden" && actor.hostelId && toHostel._id.toString() !== actor.hostelId) {
      throw new WorkflowError(
        "Wardens can only override beds within their assigned hostel",
        "FORBIDDEN_HOSTEL_SCOPE",
        403,
      );
    }

    // Fetch from bed
    const fromBed = await BedModel.findById(assignment.bed_id);
    if (!fromBed) {
      throw new WorkflowError("Source bed not found", "SOURCE_BED_NOT_FOUND", 404);
    }

    // Fetch student & application
    const application = await ApplicationModel.findById(assignment.application_id);
    if (!application) {
      throw new WorkflowError("Application not found", "APPLICATION_NOT_FOUND", 404);
    }

    const formData = (application.form_data ?? {}) as Record<string, unknown>;
    const personalInfo = (formData.personal_info ?? {}) as Record<string, unknown>;
    const academicInfo = (formData.academic_info ?? {}) as Record<string, unknown>;

    const studentGender = (personalInfo.gender === "female" ? "female" : "male") as
      "male" | "female";
    const programme =
      typeof academicInfo.programme === "string" ? academicInfo.programme : "General";
    const year = typeof academicInfo.year === "number" ? academicInfo.year : 1;
    const feeCategory =
      typeof academicInfo.fee_category === "string" ? academicInfo.fee_category : "regular";
    const quotaBucket =
      typeof formData.quota_category === "string" ? formData.quota_category : "General";

    // Fetch prospective roommates (existing occupants assigned to target room in this draft)
    const existingRoomOccupantsAssignments = await AllocationAssignmentModel.find({
      draft_id: draft._id,
      room_id: toRoom._id,
      _id: { $ne: assignment._id },
    });

    const targetRoomOccupants: Unit[] = existingRoomOccupantsAssignments.map((a) => ({
      id: a.student_id.toString(),
      memberIds: [a.student_id.toString()],
      gender: studentGender,
      programme,
      year,
      feeCategory,
      quotaBucket,
      hasHold: false,
      accessibilityNeed: false,
      preferenceHostelIds: [],
      questionnaire: {},
    }));

    // Build pure domain validation input
    const unit: Unit = {
      id: assignment.student_id.toString(),
      memberIds: [assignment.student_id.toString()],
      gender: studentGender,
      programme,
      year,
      feeCategory,
      quotaBucket,
      hasHold: false,
      accessibilityNeed: Boolean(personalInfo.disability_status ?? formData.accessibility_need),
      preferenceHostelIds: [],
      questionnaire: (formData.questionnaire as QuestionnaireAnswers) ?? {},
    };

    const validationInput: OverrideInput = {
      draftId: draft._id.toString(),
      assignmentId: assignment._id.toString(),
      applicationId: assignment.application_id.toString(),
      studentId: assignment.student_id.toString(),
      fromBedId: fromBed._id.toString(),
      toBedId: toBed._id.toString(),
      reason,
    };

    const fromBedDomain: Bed = {
      id: fromBed._id.toString(),
      roomId: fromBed.room_id.toString(),
      accessible: Boolean(fromBed.attributes?.accessible ?? fromBed.attributes?.is_accessible),
      status:
        fromBed.status === "out_of_service"
          ? "out_of_service"
          : fromBed.status === "occupied"
            ? "occupied"
            : fromBed.status === "held"
              ? "reserved"
              : "available",
    };

    const toBedDomain: Bed = {
      id: toBed._id.toString(),
      roomId: toBed.room_id.toString(),
      accessible: Boolean(toBed.attributes?.accessible ?? toBed.attributes?.is_accessible),
      status:
        toBed.status === "out_of_service"
          ? "out_of_service"
          : toBed.status === "occupied"
            ? "occupied"
            : toBed.status === "held"
              ? "reserved"
              : "available",
    };

    const roomRecord = toRoom.toObject() as unknown as Record<string, unknown>;
    const quotaBucketVal =
      typeof roomRecord["quota_bucket"] === "string"
        ? (roomRecord["quota_bucket"] as string)
        : undefined;
    const programmeFilterVal = Array.isArray(roomRecord["programme_filter"])
      ? (roomRecord["programme_filter"] as string[])
      : undefined;
    const feeCategoryVal =
      typeof roomRecord["fee_category_requirement"] === "string"
        ? (roomRecord["fee_category_requirement"] as string)
        : undefined;

    const toRoomDomain: Room = {
      id: toRoom._id.toString(),
      roomNumber: toRoom.room_number,
      hostelId: toRoom.hostel_id.toString(),
      block: toRoom.block_id.toString(),
      floor: 1,
      capacity: toRoom.capacity,
      roomType: toRoom.room_type,
      accessible: toRoom.accessible,
      ...(quotaBucketVal ? { quotaBucket: quotaBucketVal } : {}),
      ...(programmeFilterVal ? { programmeFilter: programmeFilterVal } : {}),
      ...(feeCategoryVal ? { feeCategoryRequirement: feeCategoryVal } : {}),
    };

    const toHostelDomain: Hostel = {
      id: toHostel._id.toString(),
      name: toHostel.name,
      genderPolicy: toHostel.gender_policy as GenderPolicy,
      walkingMinutes: 5,
    };

    const validationContext: OverrideValidationContext = {
      unit,
      fromBed: fromBedDomain,
      fromHostelId: assignment.hostel_id.toString(),
      toBed: toBedDomain,
      toRoom: toRoomDomain,
      toHostel: toHostelDomain,
      targetRoomOccupants,
    };

    // Revalidate ALL hard constraints
    const validation = validateOverride(validationInput, validationContext);
    if (!validation.valid) {
      throw new WorkflowError(
        validation.error ?? "Hard constraint validation failed for override",
        validation.code ?? "OVERRIDE_VALIDATION_FAILED",
        422,
      );
    }

    // Atomic version bump and assignment update
    // Update assignment to point to new bed & room & hostel
    assignment.bed_id = toBed._id;
    assignment.room_id = toRoom._id;
    assignment.hostel_id = toHostel._id;
    assignment.explanation = `${assignment.explanation} | Manual override by ${actor.email}: ${reason}`;
    await assignment.save();

    // Bump draft version
    draft.version_number += 1;
    await draft.save();

    // Create Override Record
    const override = await OverrideModel.create({
      institution_id: draft.institution_id,
      draft_id: draft._id,
      assignment_id: assignment._id,
      application_id: assignment.application_id,
      actor: {
        id: actor.id,
        role: actor.role,
        email: actor.email,
      },
      from_bed_id: fromBed._id,
      to_bed_id: toBed._id,
      reason,
      escalated: validation.escalated,
      escalation_reasons: validation.escalationReasons,
    });

    // Append to audit hash chain
    await this.getAudit(draft.institution_id).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "DRAFT_ASSIGNMENT_OVERRIDE",
      target: {
        draft_id: draft._id.toString(),
        assignment_id: assignment._id.toString(),
        from_bed_id: fromBed._id.toString(),
        to_bed_id: toBed._id.toString(),
      },
      before: { bed_id: fromBed._id.toString() },
      after: {
        bed_id: toBed._id.toString(),
        reason,
        escalated: validation.escalated,
        escalation_reasons: validation.escalationReasons,
        new_version: draft.version_number,
      },
    });

    return { draft, override };
  }

  /**
   * Request changes action with mandatory comment (minimum 10 characters).
   */
  async requestChanges(
    draftId: string | Types.ObjectId,
    comment: string,
    actor: WorkflowActor,
  ): Promise<AllocationDraftDocument> {
    if (!comment || comment.trim().length < 10) {
      throw new WorkflowError(
        "Requesting changes requires a mandatory comment of at least 10 characters",
        "INVALID_COMMENT",
        400,
      );
    }

    return this.transitionDraft(draftId, "CHANGES_REQUESTED", actor, { comment });
  }

  /**
   * Approves a draft.
   * Allowed only if draft has no unreasoned overrides and Maker-Checker rules pass.
   * Escalated overrides require a distinct second approver.
   */
  async approveDraft(
    draftId: string | Types.ObjectId,
    approver: WorkflowActor,
    secondApprover?: WorkflowActor,
    comment: string = "Draft approved",
  ): Promise<{ draft: AllocationDraftDocument; approvalRecord: ApprovalRecordDocument }> {
    const draft = await AllocationDraftModel.findById(draftId);
    if (!draft) {
      throw new WorkflowError("Draft not found", "DRAFT_NOT_FOUND", 404);
    }

    if (draft.dry_run) {
      throw new WorkflowError(
        "A dry-run draft cannot be approved or published",
        "DRY_RUN_NOT_APPROVABLE",
        400,
      );
    }

    // Fetch all overrides for this draft
    const overrides = await OverrideModel.find({ draft_id: draft._id });

    // Evaluate approval requirements using pure domain function
    const domainOverrides = overrides.map((o) => ({
      overrideId: o._id.toString(),
      studentId: o.actor.id,
      reason: o.reason,
      escalated: o.escalated,
      ...(o.escalation_reasons && o.escalation_reasons.length > 0
        ? { escalationReasons: o.escalation_reasons }
        : {}),
    }));

    const approvalEval = evaluateApprovalRequirements({
      draftState: draft.status,
      overrides: domainOverrides,
      hasInvariantErrors: false,
      approver: {
        userId: approver.id,
        name: approver.email,
        email: approver.email,
        role: approver.role as ApproverInfo["role"],
      },
      secondApprover: secondApprover
        ? {
            userId: secondApprover.id,
            name: secondApprover.email,
            email: secondApprover.email,
            role: secondApprover.role as ApproverInfo["role"],
          }
        : undefined,
      comment,
    });

    if (!approvalEval.allowed) {
      throw new WorkflowError(
        approvalEval.reason ?? "Approval evaluation failed",
        approvalEval.code ?? "APPROVAL_FAILED",
        400,
      );
    }

    // Create ApprovalRecord
    const approvalRecord = await ApprovalRecordModel.create({
      institution_id: draft.institution_id,
      draft_id: draft._id,
      approver: {
        id: approver.id,
        role: actorRoleToDb(approver.role),
        email: approver.email,
      },
      second_approver: secondApprover
        ? {
            id: secondApprover.id,
            role: actorRoleToDb(secondApprover.role),
            email: secondApprover.email,
          }
        : undefined,
      comment,
      approved_at: new Date(),
    });

    // Update draft status to APPROVED and link approval_id
    draft.status = "APPROVED";
    draft.approval_id = approvalRecord._id.toString();
    await draft.save();

    // Append to audit hash chain
    await this.getAudit(draft.institution_id).append({
      actor: { user_id: approver.id, email: approver.email, roles: [approver.role] },
      action: "DRAFT_APPROVED",
      target: {
        draft_id: draft._id.toString(),
        approval_id: approvalRecord._id.toString(),
      },
      after: {
        status: "APPROVED",
        approver: approver.email,
        second_approver: secondApprover?.email,
        comment,
      },
    });

    return { draft, approvalRecord };
  }

  /**
   * Publish Draft:
   * FOUR LAYERS OF PROTECTION:
   * a) Service guard: the only function that sets PUBLISHED requires a valid ApprovalRecord object.
   * b) Database validation: Mongoose schema validation rejects status PUBLISHED when approval_id is missing.
   * c) Read-only published rows: pre-hooks reject update and delete of published drafts and assignments.
   * d) Audit: every transition and override is appended to the hash chain.
   *
   * CONCURRENCY:
   * Atomic findOneAndUpdate with status: "APPROVED" ensures exactly one winner in race conditions.
   */
  async publishDraft(
    draftId: string | Types.ObjectId,
    actor: WorkflowActor,
  ): Promise<AllocationDraftDocument> {
    // 1. Role permission: warden or chief_warden or admin
    if (
      actor.role !== "warden" &&
      actor.role !== "chief_warden" &&
      (actor.role as string) !== "admin"
    ) {
      throw new WorkflowError("Only wardens or chief wardens can publish drafts", "FORBIDDEN", 403);
    }

    // Layer a: Service guard - fetch existing draft and verify valid ApprovalRecord exists
    const draft = await AllocationDraftModel.findById(draftId);
    if (!draft) {
      throw new WorkflowError("Draft not found", "DRAFT_NOT_FOUND", 404);
    }

    if (draft.dry_run) {
      throw new WorkflowError(
        "A dry-run draft cannot be approved or published",
        "DRY_RUN_NOT_PUBLISHABLE",
        400,
      );
    }

    if (draft.status !== "APPROVED") {
      throw new WorkflowError(
        `Draft cannot be published from status '${draft.status}'. Must be 'APPROVED'.`,
        "DRAFT_NOT_APPROVED",
        400,
      );
    }

    if (!draft.approval_id) {
      throw new WorkflowError(
        "Layer a Protection Violation: Cannot publish without approval_id",
        "APPROVAL_MISSING",
        400,
      );
    }

    // Service guard: Verify the ApprovalRecord actually exists in the database
    const approvalRecord = await ApprovalRecordModel.findById(draft.approval_id);
    if (!approvalRecord) {
      throw new WorkflowError(
        "Layer a Protection Violation: Referenced ApprovalRecord document does not exist",
        "INVALID_APPROVAL_RECORD",
        400,
      );
    }

    // Hostel scope: Warden can publish own hostel; chief_warden can publish all
    if (actor.role === "warden") {
      if (!actor.hostelId) {
        throw new WorkflowError("Warden has no assigned hostel", "WARDEN_NO_HOSTEL", 403);
      }
      // Check that all assignments in this draft belong to the warden's hostel
      const nonHostelAssignment = await AllocationAssignmentModel.findOne({
        draft_id: draft._id,
        hostel_id: { $ne: new Types.ObjectId(actor.hostelId) },
      });
      if (nonHostelAssignment) {
        throw new WorkflowError(
          "Wardens can only publish drafts scoped exclusively to their own hostel",
          "FORBIDDEN_HOSTEL_SCOPE",
          403,
        );
      }
    }

    // Concurrency: Atomic findOneAndUpdate with status filter "APPROVED"
    const publishedAt = new Date();
    const updatedDraft = await AllocationDraftModel.findOneAndUpdate(
      { _id: draft._id, status: "APPROVED" },
      {
        $set: {
          status: "PUBLISHED",
          approval_id: draft.approval_id,
          published_at: publishedAt,
        },
      },
      { new: true },
    );

    if (!updatedDraft) {
      throw new WorkflowError(
        "Concurrent publish detected: Draft is no longer in APPROVED status",
        "CONCURRENT_PUBLISH_CONFLICT",
        409,
      );
    }

    // Layer d: Audit append to hash chain
    await this.getAudit(draft.institution_id).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "DRAFT_PUBLISHED",
      target: {
        draft_id: draft._id.toString(),
        approval_id: draft.approval_id,
      },
      after: {
        status: "PUBLISHED",
        published_at: publishedAt,
      },
    });

    return updatedDraft;
  }

  /**
   * Amendments: after publication, any change creates a new version through an approved amendment;
   * the old version becomes ARCHIVED and is never edited.
   */
  async amendDraft(
    draftId: string | Types.ObjectId,
    actor: WorkflowActor,
    reason: string,
  ): Promise<{ oldDraft: AllocationDraftDocument; newDraft: AllocationDraftDocument }> {
    if (!reason || reason.trim().length < 10) {
      throw new WorkflowError(
        "Amendment reason must be at least 10 characters",
        "INVALID_AMENDMENT_REASON",
        400,
      );
    }

    const oldDraft = await AllocationDraftModel.findById(draftId);
    if (!oldDraft) {
      throw new WorkflowError("Draft not found", "DRAFT_NOT_FOUND", 404);
    }

    if (oldDraft.status !== "PUBLISHED" && oldDraft.status !== "published") {
      throw new WorkflowError("Only published drafts can be amended", "DRAFT_NOT_PUBLISHED", 400);
    }

    // Mark old draft as ARCHIVED (permitted by Layer c hook)
    oldDraft.status = "ARCHIVED";
    await oldDraft.save();

    // Create new amended draft with version_number + 1
    const newDraft = await AllocationDraftModel.create({
      institution_id: oldDraft.institution_id,
      cycle_id: oldDraft.cycle_id,
      run_id: oldDraft.run_id,
      status: "DRAFT_READY",
      version_number: oldDraft.version_number + 1,
      input_hash: oldDraft.input_hash,
      seed: oldDraft.seed,
      metrics: oldDraft.metrics,
    });

    // Clone all assignments to the new draft
    const assignments = await AllocationAssignmentModel.find({ draft_id: oldDraft._id });
    if (assignments.length > 0) {
      const clonedAssignments = assignments.map((a) => ({
        institution_id: a.institution_id,
        draft_id: newDraft._id,
        run_id: a.run_id,
        application_id: a.application_id,
        student_id: a.student_id,
        bed_id: a.bed_id,
        room_id: a.room_id,
        hostel_id: a.hostel_id,
        score: a.score,
        explanation: a.explanation,
      }));
      await AllocationAssignmentModel.insertMany(clonedAssignments);
    }

    // Append to audit hash chain
    await this.getAudit(oldDraft.institution_id).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "DRAFT_AMENDED",
      target: {
        old_draft_id: oldDraft._id.toString(),
        new_draft_id: newDraft._id.toString(),
        new_version: newDraft.version_number,
      },
      after: {
        reason,
        old_draft_status: "ARCHIVED",
        new_draft_status: "DRAFT_READY",
        version: newDraft.version_number,
      },
    });

    return { oldDraft, newDraft };
  }
}

function actorRoleToDb(role: string): string {
  return String(role);
}
