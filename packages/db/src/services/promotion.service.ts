import type { Types } from "mongoose";
import {
  findPromotionCandidate,
  reorderWaitlistQueue,
  reconcileOccupancy as domainReconcileOccupancy,
  type PromotionPolicy,
  type PromotionTrigger,
  type WaitlistUnit,
  type Bed as DomainBed,
  type Room as DomainRoom,
  type Hostel as DomainHostel,
  type Unit as DomainUnit,
  type ReconciliationReport,
  type RoomOccupancyCounter,
  type AssignmentRecord,
} from "@hostelhub/domain";
import {
  AllocationDraftModel,
  type AllocationDraftDocument,
} from "../models/allocation-draft.model.js";
import { AllocationCycleModel } from "../models/allocation-cycle.model.js";
import { AllocationAssignmentModel } from "../models/allocation-assignment.model.js";
import { WaitlistEntryModel, type WaitlistEntryDocument } from "../models/waitlist-entry.model.js";
import {
  PromotionProposalModel,
  type PromotionProposalDocument,
} from "../models/promotion-proposal.model.js";
import { BedModel } from "../models/bed.model.js";
import { RoomModel } from "../models/room.model.js";
import { HostelModel } from "../models/hostel.model.js";
import { ApplicationModel } from "../models/application.model.js";
import { UserModel } from "../models/user.model.js";
import { AuditService } from "./audit.service.js";
import { DraftWorkflowService, type WorkflowActor } from "./draft-workflow.service.js";

export interface PromotionNotificationPayload {
  type: "promotion" | "proposal_created" | "amendment";
  studentId: string;
  studentEmail?: string | undefined;
  wardenEmail?: string | undefined;
  bedId: string;
  roomNumber: string;
  hostelName: string;
  trigger: string;
  details: string;
}

export type PromotionNotificationHook = (payload: PromotionNotificationPayload) => Promise<void>;

export class PromotionServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "PromotionServiceError";
  }
}

export class PromotionService {
  constructor(
    private readonly auditService?: AuditService,
    private readonly workflowService: DraftWorkflowService = new DraftWorkflowService(auditService),
    private readonly notificationHook: PromotionNotificationHook = async (p) => {
      // Default notification hook: log structured event
      console.log(
        `[NOTIFICATION HOOK] ${p.type.toUpperCase()}: ${p.details} (Student: ${p.studentId}, Bed: ${p.bedId})`,
      );
    },
  ) {}

  private getAudit(institutionId: Types.ObjectId | string): AuditService {
    if (this.auditService) return this.auditService;
    return AuditService.withTenant(institutionId);
  }

  /**
   * System Actor for automated operations
   */
  private static readonly SYSTEM_ACTOR: WorkflowActor = {
    id: "system-promotion-engine",
    email: "system@hostelhub.internal",
    role: "admin",
  };

  /**
   * Vacate a bed due to a specific trigger (withdrawal, no_show, override, etc.)
   * and automatically evaluate promotion for the waitlist.
   */
  async handleVacatedBed(
    draftId: string | Types.ObjectId,
    bedId: string | Types.ObjectId,
    trigger: PromotionTrigger,
    actor: WorkflowActor,
    options: {
      reason?: string;
      policyOverride?: PromotionPolicy;
    } = {},
  ): Promise<{
    vacatedBedId: string;
    previousStudentId?: string;
    promotionResult: {
      action: "promoted" | "proposal_created" | "no_candidate_found";
      proposalId?: string;
      promotedStudentId?: string;
      amendedDraftId?: string;
      skippedCount: number;
    };
  }> {
    const draft = await AllocationDraftModel.findById(draftId);
    if (!draft) {
      throw new PromotionServiceError("Draft not found", "DRAFT_NOT_FOUND", 404);
    }

    const bed = await BedModel.findById(bedId);
    if (!bed) {
      throw new PromotionServiceError("Bed not found", "BED_NOT_FOUND", 404);
    }

    // 1. Remove existing assignment on this bed if any
    const existingAssignment = await AllocationAssignmentModel.findOne({
      draft_id: draft._id,
      bed_id: bed._id,
    });

    let previousStudentId: string | undefined;
    if (existingAssignment) {
      previousStudentId = existingAssignment.student_id.toString();
      await AllocationAssignmentModel.deleteOne({ _id: existingAssignment._id });

      // Audit removal
      await this.getAudit(draft.institution_id).append({
        actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
        action: `BED_VACATED_${trigger.toUpperCase()}`,
        target: {
          draft_id: draft._id.toString(),
          bed_id: bed._id.toString(),
          student_id: previousStudentId,
        },
        after: {
          trigger,
          reason: options.reason ?? `Bed vacated via ${trigger}`,
        },
      });
    }

    // 2. Promote into the newly vacated bed
    const promotionOutcome = await this.promoteVacatedBed(
      draft._id,
      bed._id,
      trigger,
      actor,
      options.policyOverride,
    );

    const resultPayload: {
      action: "promoted" | "proposal_created" | "no_candidate_found";
      proposalId?: string;
      promotedStudentId?: string;
      amendedDraftId?: string;
      skippedCount: number;
    } = {
      action: promotionOutcome.action,
      skippedCount: promotionOutcome.skippedUnits.length,
      ...(promotionOutcome.proposal
        ? { proposalId: promotionOutcome.proposal._id.toString() }
        : {}),
      ...(promotionOutcome.candidate?.members[0]?.id
        ? { promotedStudentId: promotionOutcome.candidate.members[0].id }
        : {}),
      ...(promotionOutcome.amendedDraft
        ? { amendedDraftId: promotionOutcome.amendedDraft._id.toString() }
        : {}),
    };

    return {
      vacatedBedId: bed._id.toString(),
      ...(previousStudentId ? { previousStudentId } : {}),
      promotionResult: resultPayload,
    };
  }

  /**
   * Promote into a vacated bed:
   * 1. Query available beds and current roommates in the room.
   * 2. Query all waitlisted applications in position order.
   * 3. Run pure domain candidate selection with all hard constraints (HC1-HC11).
   * 4. Apply cycle policy (auto_confirm vs proposal_required).
   * 5. If draft is published, create amendment version under system actor.
   */
  async promoteVacatedBed(
    draftId: string | Types.ObjectId,
    bedId: string | Types.ObjectId,
    trigger: PromotionTrigger,
    actor: WorkflowActor,
    policyOverride?: PromotionPolicy,
  ): Promise<{
    action: "promoted" | "proposal_created" | "no_candidate_found";
    proposal?: PromotionProposalDocument;
    candidate?: WaitlistUnit | null;
    skippedUnits: Array<{ unitId: string; reasonCode: string; message: string }>;
    amendedDraft?: AllocationDraftDocument;
  }> {
    const draft = await AllocationDraftModel.findById(draftId);
    if (!draft) {
      throw new PromotionServiceError("Draft not found", "DRAFT_NOT_FOUND", 404);
    }

    const cycle = await AllocationCycleModel.findById(draft.cycle_id);
    const cyclePolicy: PromotionPolicy =
      policyOverride ?? (cycle?.promotion_policy as PromotionPolicy) ?? "auto_confirm";

    const bed = await BedModel.findById(bedId);
    if (!bed) {
      throw new PromotionServiceError("Bed not found", "BED_NOT_FOUND", 404);
    }

    const room = await RoomModel.findById(bed.room_id);
    if (!room) {
      throw new PromotionServiceError("Room not found", "ROOM_NOT_FOUND", 404);
    }

    const hostel = await HostelModel.findById(room.hostel_id);
    if (!hostel) {
      throw new PromotionServiceError("Hostel not found", "HOSTEL_NOT_FOUND", 404);
    }

    // Identify all assigned bed IDs in this room in this draft
    const existingAssignmentsInRoom = await AllocationAssignmentModel.find({
      draft_id: draft._id,
      room_id: room._id,
    });
    const occupiedBedIds = new Set(existingAssignmentsInRoom.map((a) => a.bed_id.toString()));

    // All beds belonging to the room
    const allBedsInRoom = await BedModel.find({ room_id: room._id });
    const availableBeds = allBedsInRoom.filter(
      (b) => !occupiedBedIds.has(b._id.toString()) || b._id.toString() === bed._id.toString(),
    );

    // Current room occupants as Unit objects
    const currentRoomOccupantUnits: DomainUnit[] = [];
    for (const a of existingAssignmentsInRoom) {
      if (a.bed_id.toString() === bed._id.toString()) continue; // Skip the vacated bed
      const app = await ApplicationModel.findById(a.application_id);
      const formData = (app?.form_data ?? {}) as Record<string, unknown>;
      const personalInfo = (formData.personal_info ?? {}) as Record<string, unknown>;
      const academicInfo = (formData.academic_info ?? {}) as Record<string, unknown>;

      currentRoomOccupantUnits.push({
        id: a.student_id.toString(),
        memberIds: [a.student_id.toString()],
        gender: personalInfo.gender === "female" ? "female" : "male",
        programme: typeof academicInfo.programme === "string" ? academicInfo.programme : "General",
        year: typeof academicInfo.year === "number" ? academicInfo.year : 1,
        feeCategory:
          typeof academicInfo.fee_category === "string" ? academicInfo.fee_category : "regular",
        quotaBucket:
          typeof formData.quota_category === "string" ? formData.quota_category : "General",
        hasHold: false,
        accessibilityNeed: false,
        preferenceHostelIds: [],
        questionnaire: {},
      });
    }

    // Fetch waitlisted entries for this draft
    const waitlistDocs = await WaitlistEntryModel.find({
      draft_id: draft._id,
      status: "waiting",
    }).sort({ position: 1, priority_score: -1 });

    const waitlistUnits: WaitlistUnit[] = [];
    for (const entry of waitlistDocs) {
      const app = await ApplicationModel.findById(entry.application_id);
      const formData = (app?.form_data ?? {}) as Record<string, unknown>;
      const personalInfo = (formData.personal_info ?? {}) as Record<string, unknown>;
      const academicInfo = (formData.academic_info ?? {}) as Record<string, unknown>;

      const isAccessibleNeed = Boolean(
        personalInfo.accessibility_need ||
        personalInfo.pwd ||
        (Array.isArray(personalInfo.medical_conditions) &&
          personalInfo.medical_conditions.length > 0),
      );

      waitlistUnits.push({
        id: entry.student_id.toString(),
        position: entry.position,
        priorityScore: entry.priority_score ?? 0,
        policyTier: 1,
        quotaBucket: entry.quota_bucket,
        status: entry.status ?? "waiting",
        members: [
          {
            id: entry.student_id.toString(),
            applicationId: entry.application_id.toString(),
            name: `${personalInfo.first_name ?? "Student"} ${personalInfo.last_name ?? ""}`.trim(),
            gender: personalInfo.gender === "female" ? "female" : "male",
            hasAccessibilityNeed: isAccessibleNeed,
            priorityScore: entry.priority_score ?? 0,
            programme:
              typeof academicInfo.programme === "string" ? academicInfo.programme : "General",
            year: typeof academicInfo.year === "number" ? academicInfo.year : 1,
          },
        ],
      });
    }

    // Convert models to domain structures
    const domainVacatedBed: DomainBed = {
      id: bed._id.toString(),
      roomId: room._id.toString(),
      status: "available",
      accessible: Boolean((bed.attributes?.accessible as boolean | undefined) || room.accessible),
    };

    const domainRoom: DomainRoom = {
      id: room._id.toString(),
      hostelId: hostel._id.toString(),
      roomNumber: room.room_number,
      capacity: room.capacity,
      block: "A",
      floor: 1,
      roomType: room.room_type,
      accessible: Boolean(room.accessible),
    };

    const domainHostel: DomainHostel = {
      id: hostel._id.toString(),
      name: hostel.name,
      genderPolicy:
        hostel.gender_policy === "female"
          ? "female"
          : hostel.gender_policy === "coed"
            ? "coed"
            : "male",
      walkingMinutes: 5,
    };

    const domainAvailableBeds: DomainBed[] = availableBeds.map((b) => ({
      id: b._id.toString(),
      roomId: room._id.toString(),
      status: "available",
      accessible: Boolean((b.attributes?.accessible as boolean | undefined) || room.accessible),
    }));

    // Find candidate using pure domain logic
    const candidateResult = findPromotionCandidate({
      vacatedBed: domainVacatedBed,
      vacatedRoom: domainRoom,
      vacatedHostel: domainHostel,
      availableBedsInRoom: domainAvailableBeds,
      currentRoomOccupantUnits,
      allWaitlistedUnits: waitlistUnits,
    });

    if (!candidateResult.unit) {
      return {
        action: "no_candidate_found",
        candidate: null,
        skippedUnits: candidateResult.skippedUnits,
      };
    }

    const candidateUnit = candidateResult.unit;
    const targetWaitlistDoc = waitlistDocs.find(
      (w) => w.student_id.toString() === candidateUnit.id,
    )!;

    // Policy check: Proposal Required
    if (cyclePolicy === "proposal_required") {
      const proposal = await PromotionProposalModel.create({
        institution_id: draft.institution_id,
        draft_id: draft._id,
        cycle_id: draft.cycle_id,
        waitlist_entry_id: targetWaitlistDoc._id,
        application_id: targetWaitlistDoc.application_id,
        student_id: targetWaitlistDoc.student_id,
        bed_id: bed._id,
        room_id: room._id,
        hostel_id: hostel._id,
        trigger,
        status: "pending",
        created_by: {
          id: actor.id,
          email: actor.email,
          role: actor.role,
        },
      });

      targetWaitlistDoc.status = "proposal_pending";
      await targetWaitlistDoc.save();

      // Audit proposal creation
      await this.getAudit(draft.institution_id).append({
        actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
        action: "PROMOTION_PROPOSAL_CREATED",
        target: {
          proposal_id: proposal._id.toString(),
          draft_id: draft._id.toString(),
          student_id: targetWaitlistDoc.student_id.toString(),
          bed_id: bed._id.toString(),
        },
        after: {
          trigger,
          policy: "proposal_required",
        },
      });

      // Notification to warden
      await this.notificationHook({
        type: "proposal_created",
        studentId: targetWaitlistDoc.student_id.toString(),
        wardenEmail: actor.email,
        bedId: bed._id.toString(),
        roomNumber: room.room_number,
        hostelName: hostel.name,
        trigger,
        details: `Promotion proposal pending review for student ${targetWaitlistDoc.student_id} to Bed ${bed.bed_no} in Room ${room.room_number}`,
      });

      return {
        action: "proposal_created",
        proposal,
        candidate: candidateUnit,
        skippedUnits: candidateResult.skippedUnits,
      };
    }

    // Policy check: Auto Confirm
    let amendedDraft: AllocationDraftDocument | undefined;
    let effectiveDraftId = draft._id;

    // If draft is published, create an amendment first using system actor
    if (draft.status === "PUBLISHED" || draft.status === "published") {
      const amendmentResult = await this.workflowService.amendDraft(
        draft._id,
        PromotionService.SYSTEM_ACTOR,
        `Automatic waitlist promotion: Bed ${bed.bed_no} vacated via ${trigger}`,
      );
      amendedDraft = amendmentResult.newDraft;
      effectiveDraftId = amendedDraft._id;
    }

    // Execute assignment
    await AllocationAssignmentModel.create({
      institution_id: draft.institution_id,
      draft_id: effectiveDraftId,
      run_id: draft.run_id,
      application_id: targetWaitlistDoc.application_id,
      student_id: targetWaitlistDoc.student_id,
      bed_id: bed._id,
      room_id: room._id,
      hostel_id: hostel._id,
      score: targetWaitlistDoc.priority_score ?? 100,
      explanation: `Promoted from waitlist (Trigger: ${trigger}, Priority: ${targetWaitlistDoc.priority_score ?? 0})`,
    });

    // Mark waitlist entry promoted
    targetWaitlistDoc.status = "promoted";
    await targetWaitlistDoc.save();

    // Reorder remaining waiting entries to fill the position gap
    const remainingWaiting = await WaitlistEntryModel.find({
      draft_id: effectiveDraftId,
      status: "waiting",
      position: { $gt: targetWaitlistDoc.position },
    }).sort({ position: 1 });

    for (let i = 0; i < remainingWaiting.length; i++) {
      const item = remainingWaiting[i];
      if (item) {
        item.position = targetWaitlistDoc.position + i;
        await item.save();
      }
    }

    // Audit promotion
    await this.getAudit(draft.institution_id).append({
      actor: {
        user_id: actor.id === "system-promotion-engine" ? "SYSTEM" : actor.id,
        email: actor.email,
        roles: [actor.role],
      },
      action: amendedDraft ? "PROMOTION_AUTO_CONFIRMED_WITH_AMENDMENT" : "PROMOTION_AUTO_CONFIRMED",
      target: {
        draft_id: effectiveDraftId.toString(),
        student_id: targetWaitlistDoc.student_id.toString(),
        bed_id: bed._id.toString(),
      },
      after: {
        trigger,
        policy: "auto_confirm",
        ...(amendedDraft ? { amendedDraftId: amendedDraft._id.toString() } : {}),
      },
    });

    // Student & Warden Notification Hook
    const studentUser = await UserModel.findById(targetWaitlistDoc.student_id);
    await this.notificationHook({
      type: "promotion",
      studentId: targetWaitlistDoc.student_id.toString(),
      studentEmail: studentUser?.email,
      wardenEmail: actor.email,
      bedId: bed._id.toString(),
      roomNumber: room.room_number,
      hostelName: hostel.name,
      trigger,
      details: `Waitlisted student promoted to Bed ${bed.bed_no} in Room ${room.room_number} (${hostel.name})`,
    });

    return {
      action: "promoted",
      candidate: candidateUnit,
      skippedUnits: candidateResult.skippedUnits,
      ...(amendedDraft ? { amendedDraft } : {}),
    };
  }

  /**
   * Confirm a pending promotion proposal by warden.
   */
  async confirmProposal(
    proposalId: string | Types.ObjectId,
    actor: WorkflowActor,
    comment?: string,
  ): Promise<{
    proposal: PromotionProposalDocument;
    assignmentId: string;
    amendedDraft?: AllocationDraftDocument;
  }> {
    const proposal = await PromotionProposalModel.findById(proposalId);
    if (!proposal) {
      throw new PromotionServiceError("Proposal not found", "PROPOSAL_NOT_FOUND", 404);
    }

    if (proposal.status !== "pending") {
      throw new PromotionServiceError(
        `Proposal is not pending (status: ${proposal.status})`,
        "PROPOSAL_NOT_PENDING",
        400,
      );
    }

    const draft = await AllocationDraftModel.findById(proposal.draft_id);
    if (!draft) {
      throw new PromotionServiceError("Draft not found", "DRAFT_NOT_FOUND", 404);
    }

    const waitlistDoc = await WaitlistEntryModel.findById(proposal.waitlist_entry_id);
    if (!waitlistDoc) {
      throw new PromotionServiceError("Waitlist entry not found", "WAITLIST_ENTRY_NOT_FOUND", 404);
    }

    const bed = await BedModel.findById(proposal.bed_id);
    const room = await RoomModel.findById(proposal.room_id);
    const hostel = await HostelModel.findById(proposal.hostel_id);

    let amendedDraft: AllocationDraftDocument | undefined;
    let effectiveDraftId = draft._id;

    // Handle amendment if draft was published
    if (draft.status === "PUBLISHED" || draft.status === "published") {
      const amendmentResult = await this.workflowService.amendDraft(
        draft._id,
        actor,
        comment ?? `Warden confirmed promotion proposal for Bed ${bed?.bed_no ?? "unknown"}`,
      );
      amendedDraft = amendmentResult.newDraft;
      effectiveDraftId = amendedDraft._id;
    }

    // Create assignment
    const assignment = await AllocationAssignmentModel.create({
      institution_id: draft.institution_id,
      draft_id: effectiveDraftId,
      run_id: draft.run_id,
      application_id: proposal.application_id,
      student_id: proposal.student_id,
      bed_id: proposal.bed_id,
      room_id: proposal.room_id,
      hostel_id: proposal.hostel_id,
      score: waitlistDoc.priority_score ?? 100,
      explanation: `Promotion proposal confirmed by warden ${actor.email} (${comment ?? "Approved"})`,
    });

    // Update waitlist entry
    waitlistDoc.status = "promoted";
    await waitlistDoc.save();

    // Update proposal status
    proposal.status = "confirmed";
    proposal.warden_comment = comment;
    proposal.resolved_by = {
      id: actor.id,
      email: actor.email,
      role: actor.role,
    };
    proposal.resolved_at = new Date();
    await proposal.save();

    // Reorder remaining queue
    const remainingWaiting = await WaitlistEntryModel.find({
      draft_id: effectiveDraftId,
      status: "waiting",
      position: { $gt: waitlistDoc.position },
    }).sort({ position: 1 });

    for (let i = 0; i < remainingWaiting.length; i++) {
      const item = remainingWaiting[i];
      if (item) {
        item.position = waitlistDoc.position + i;
        await item.save();
      }
    }

    // Audit log
    await this.getAudit(draft.institution_id).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "PROMOTION_PROPOSAL_CONFIRMED",
      target: {
        proposal_id: proposal._id.toString(),
        draft_id: effectiveDraftId.toString(),
        student_id: proposal.student_id.toString(),
        bed_id: proposal.bed_id.toString(),
      },
      after: {
        comment,
        status: "confirmed",
        ...(amendedDraft ? { amendedDraftId: amendedDraft._id.toString() } : {}),
      },
    });

    // Student & Warden Notification Hook
    const studentUser = await UserModel.findById(proposal.student_id);
    await this.notificationHook({
      type: "promotion",
      studentId: proposal.student_id.toString(),
      studentEmail: studentUser?.email,
      wardenEmail: actor.email,
      bedId: proposal.bed_id.toString(),
      roomNumber: room?.room_number ?? "N/A",
      hostelName: hostel?.name ?? "Hostel",
      trigger: proposal.trigger,
      details: `Promotion proposal confirmed by warden for student ${proposal.student_id}`,
    });

    return {
      proposal,
      assignmentId: assignment._id.toString(),
      ...(amendedDraft ? { amendedDraft } : {}),
    };
  }

  /**
   * Reject a pending promotion proposal.
   */
  async rejectProposal(
    proposalId: string | Types.ObjectId,
    actor: WorkflowActor,
    reason: string,
  ): Promise<PromotionProposalDocument> {
    if (!reason || reason.trim().length < 5) {
      throw new PromotionServiceError(
        "Rejection reason must be at least 5 characters",
        "INVALID_REJECTION_REASON",
        400,
      );
    }

    const proposal = await PromotionProposalModel.findById(proposalId);
    if (!proposal) {
      throw new PromotionServiceError("Proposal not found", "PROPOSAL_NOT_FOUND", 404);
    }

    if (proposal.status !== "pending") {
      throw new PromotionServiceError(
        `Proposal is not pending (status: ${proposal.status})`,
        "PROPOSAL_NOT_PENDING",
        400,
      );
    }

    proposal.status = "rejected";
    proposal.rejection_reason = reason;
    proposal.resolved_by = {
      id: actor.id,
      email: actor.email,
      role: actor.role,
    };
    proposal.resolved_at = new Date();
    await proposal.save();

    // Reset waitlist entry to waiting
    await WaitlistEntryModel.findByIdAndUpdate(proposal.waitlist_entry_id, {
      $set: { status: "waiting" },
    });

    // Audit log
    await this.getAudit(proposal.institution_id).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "PROMOTION_PROPOSAL_REJECTED",
      target: {
        proposal_id: proposal._id.toString(),
        draft_id: proposal.draft_id.toString(),
        student_id: proposal.student_id.toString(),
      },
      after: {
        reason,
        status: "rejected",
      },
    });

    return proposal;
  }

  /**
   * Manual promotion with mandatory reason (>= 10 chars).
   */
  async manualPromote(
    draftId: string | Types.ObjectId,
    waitlistEntryId: string | Types.ObjectId,
    bedId: string | Types.ObjectId,
    reason: string,
    actor: WorkflowActor,
  ): Promise<{
    assignmentId: string;
    amendedDraft?: AllocationDraftDocument;
  }> {
    if (!reason || reason.trim().length < 10) {
      throw new PromotionServiceError(
        "Manual promotion reason must be at least 10 characters",
        "INVALID_REASON",
        400,
      );
    }

    const draft = await AllocationDraftModel.findById(draftId);
    if (!draft) {
      throw new PromotionServiceError("Draft not found", "DRAFT_NOT_FOUND", 404);
    }

    const waitlistDoc = await WaitlistEntryModel.findById(waitlistEntryId);
    if (!waitlistDoc) {
      throw new PromotionServiceError("Waitlist entry not found", "WAITLIST_ENTRY_NOT_FOUND", 404);
    }

    const bed = await BedModel.findById(bedId);
    if (!bed) {
      throw new PromotionServiceError("Bed not found", "BED_NOT_FOUND", 404);
    }

    const room = await RoomModel.findById(bed.room_id);
    if (!room) {
      throw new PromotionServiceError("Room not found", "ROOM_NOT_FOUND", 404);
    }

    let amendedDraft: AllocationDraftDocument | undefined;
    let effectiveDraftId = draft._id;

    if (draft.status === "PUBLISHED" || draft.status === "published") {
      const amendmentResult = await this.workflowService.amendDraft(draft._id, actor, reason);
      amendedDraft = amendmentResult.newDraft;
      effectiveDraftId = amendedDraft._id;
    }

    const assignment = await AllocationAssignmentModel.create({
      institution_id: draft.institution_id,
      draft_id: effectiveDraftId,
      run_id: draft.run_id,
      application_id: waitlistDoc.application_id,
      student_id: waitlistDoc.student_id,
      bed_id: bed._id,
      room_id: room._id,
      hostel_id: room.hostel_id,
      score: waitlistDoc.priority_score ?? 100,
      explanation: `Manual promotion: ${reason}`,
    });

    waitlistDoc.status = "promoted";
    await waitlistDoc.save();

    await this.getAudit(draft.institution_id).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "PROMOTION_MANUAL",
      target: {
        draft_id: effectiveDraftId.toString(),
        student_id: waitlistDoc.student_id.toString(),
        bed_id: bed._id.toString(),
      },
      after: {
        reason,
        ...(amendedDraft ? { amendedDraftId: amendedDraft._id.toString() } : {}),
      },
    });

    return {
      assignmentId: assignment._id.toString(),
      ...(amendedDraft ? { amendedDraft } : {}),
    };
  }

  /**
   * Reorder waitlist queue with mandatory reason (>= 10 chars).
   */
  async reorderWaitlist(
    draftId: string | Types.ObjectId,
    waitlistEntryId: string | Types.ObjectId,
    newPosition: number,
    reason: string,
    actor: WorkflowActor,
  ): Promise<WaitlistEntryDocument[]> {
    if (!reason || reason.trim().length < 10) {
      throw new PromotionServiceError(
        "Reorder reason must be at least 10 characters",
        "INVALID_REASON",
        400,
      );
    }

    const entries = await WaitlistEntryModel.find({
      draft_id: draftId,
      status: "waiting",
    }).sort({ position: 1 });

    const targetDoc = entries.find((e) => e._id.toString() === waitlistEntryId.toString());
    if (!targetDoc) {
      throw new PromotionServiceError("Waitlist entry not found", "ENTRY_NOT_FOUND", 404);
    }

    // Map to domain units
    const domainUnits: WaitlistUnit[] = entries.map((e) => ({
      id: e.student_id.toString(),
      position: e.position,
      priorityScore: e.priority_score ?? 0,
      policyTier: 1,
      quotaBucket: e.quota_bucket,
      status: e.status ?? "waiting",
      members: [],
    }));

    // Use pure domain logic
    const reorderResult = reorderWaitlistQueue(
      domainUnits,
      targetDoc.student_id.toString(),
      newPosition,
      reason,
      { id: actor.id, email: actor.email, role: actor.role },
    );

    // Persist new positions to database
    for (const updated of reorderResult.updatedEntries) {
      const doc = entries.find((e) => e.student_id.toString() === updated.id);
      if (doc) {
        doc.position = updated.position;
        if (doc._id.toString() === targetDoc._id.toString()) {
          doc.reorder_history = doc.reorder_history || [];
          doc.reorder_history.push({
            previousPosition: reorderResult.previousPosition,
            newPosition: reorderResult.newPosition,
            reason,
            actor: {
              id: actor.id,
              email: actor.email,
              role: actor.role,
            },
            timestamp: new Date().toISOString(),
          });
        }
        await doc.save();
      }
    }

    // Append to audit hash chain
    await this.getAudit(targetDoc.institution_id).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "WAITLIST_REORDERED",
      target: {
        draft_id: draftId.toString(),
        waitlist_entry_id: targetDoc._id.toString(),
        student_id: targetDoc.student_id.toString(),
      },
      after: {
        previousPosition: reorderResult.previousPosition,
        newPosition: reorderResult.newPosition,
        reason,
      },
    });

    return await WaitlistEntryModel.find({ draft_id: draftId }).sort({ position: 1 });
  }

  /**
   * Reconcile occupancy for a hostel in a draft:
   * Compares room and hostel capacities to active assignments and verifies 0 drift.
   */
  async reconcileHostelOccupancy(
    hostelId: string | Types.ObjectId,
    draftId: string | Types.ObjectId,
  ): Promise<ReconciliationReport> {
    const rooms = await RoomModel.find({ hostel_id: hostelId });
    const roomIds = rooms.map((r) => r._id);
    const beds = await BedModel.find({ room_id: { $in: roomIds } });
    const assignments = await AllocationAssignmentModel.find({
      draft_id: draftId,
      hostel_id: hostelId,
    });

    const domainRooms: DomainRoom[] = rooms.map((r) => ({
      id: r._id.toString(),
      hostelId: r.hostel_id.toString(),
      roomNumber: r.room_number,
      roomType: r.room_type,
      capacity: r.capacity,
      block: "A",
      floor: 1,
      accessible: Boolean(r.accessible),
    }));

    const domainBeds: DomainBed[] = beds.map((b) => ({
      id: b._id.toString(),
      roomId: b.room_id.toString(),
      status:
        b.status === "held"
          ? "reserved"
          : b.status === "out_of_service"
            ? "out_of_service"
            : b.status === "occupied"
              ? "occupied"
              : "available",
      accessible: Boolean((b.attributes?.accessible as boolean | undefined) || false),
    }));

    const assignmentRecords: AssignmentRecord[] = assignments.map((a) => ({
      id: a._id.toString(),
      studentId: a.student_id.toString(),
      bedId: a.bed_id.toString(),
      roomId: a.room_id.toString(),
      hostelId: a.hostel_id.toString(),
      active: true,
    }));

    const cachedCounters: RoomOccupancyCounter[] = rooms.map((r) => ({
      roomId: r._id.toString(),
      cachedOccupancy: assignments.filter((a) => a.room_id.toString() === r._id.toString()).length,
    }));

    return domainReconcileOccupancy(domainRooms, domainBeds, assignmentRecords, cachedCounters);
  }
}
