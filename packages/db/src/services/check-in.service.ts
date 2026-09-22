import { Types } from "mongoose";
import {
  verifyVerificationToken,
  getOrCreateDefaultTestKeyPair,
  computeChecklistDiff,
  DEFAULT_HOSTEL_CHECKLIST_TEMPLATE,
  type ChecklistCondition,
  type ChecklistItemRecord,
  type ChecklistDiffReport,
} from "@hostelhub/domain";
import {
  CheckInRecordModel,
  type CheckInRecordDocument,
  type IChecklistItemDoc,
} from "../models/check-in-record.model.js";
import {
  AllocationLetterModel,
  type AllocationLetterDocument,
} from "../models/allocation-letter.model.js";
import { AllocationDraftModel } from "../models/allocation-draft.model.js";
import { AllocationAssignmentModel } from "../models/allocation-assignment.model.js";
import { HostelModel } from "../models/hostel.model.js";
import { RoomModel } from "../models/room.model.js";
import { BedModel } from "../models/bed.model.js";
import { AuditService } from "./audit.service.js";
import { PromotionService } from "./promotion.service.js";
import { DraftWorkflowService, type WorkflowActor } from "./draft-workflow.service.js";

export class CheckInServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "CheckInServiceError";
  }
}

export interface VerifyCheckInResult {
  letter: {
    id: string;
    letterNumber: string;
    token: string;
    studentId: string;
    studentName: string;
    rollNumber: string;
    studentEmail: string;
    hostelId: string;
    hostelName: string;
    roomId: string;
    roomNumber: string;
    bedId: string;
    bedNo: string;
    moveInStartDate: string;
    moveInEndDate: string;
  };
  checklistTemplate: Array<{
    id: string;
    label: string;
    category: "furniture" | "electrical" | "plumbing" | "fixtures" | "general";
    defaultCondition: ChecklistCondition;
    required: boolean;
    description?: string | undefined;
  }>;
  existingRecord?:
    | {
        id: string;
        status: string;
        checkInTime?: string | undefined;
        studentAcknowledged: boolean;
      }
    | undefined;
}

export interface RecordCheckInInput {
  tokenOrCode: string;
  checklist: Array<{
    itemId: string;
    label: string;
    category: "furniture" | "electrical" | "plumbing" | "fixtures" | "general";
    condition: ChecklistCondition;
    notes?: string | undefined;
    photoS3Key?: string | undefined;
    photoUrl?: string | undefined;
  }>;
  notes?: string | undefined;
  clientSyncId?: string | undefined;
  clientScannedAt?: Date | undefined;
}

export interface RecordCheckOutInput {
  checklist: Array<{
    itemId: string;
    label: string;
    category: "furniture" | "electrical" | "plumbing" | "fixtures" | "general";
    condition: ChecklistCondition;
    notes?: string | undefined;
    photoS3Key?: string | undefined;
    photoUrl?: string | undefined;
  }>;
  notes?: string | undefined;
}

export class CheckInService {
  constructor(private readonly institutionId: string | Types.ObjectId) {}

  private get instId(): Types.ObjectId {
    return typeof this.institutionId === "string"
      ? new Types.ObjectId(this.institutionId)
      : this.institutionId;
  }

  private getAudit(): AuditService {
    return AuditService.withTenant(this.instId);
  }

  /**
   * Verifies an Ed25519 letter token or manual letter code,
   * retrieves student & room details, and resolves the hostel's checklist template.
   */
  async verifyAndPrepareCheckIn(tokenOrCode: string): Promise<VerifyCheckInResult> {
    if (!tokenOrCode || typeof tokenOrCode !== "string") {
      throw new CheckInServiceError("Token or letter code is required", "INVALID_TOKEN", 400);
    }

    const trimmed = tokenOrCode.trim();
    let letterDoc: AllocationLetterDocument | null = null;

    // Check if it's a signed JWT-style token (3 dot-separated segments)
    if (trimmed.split(".").length === 3) {
      const defaultKeys = getOrCreateDefaultTestKeyPair();
      const verification = await verifyVerificationToken(trimmed, (kid) => {
        const envKey = process.env["ED25519_PUBLIC_KEY"];
        if (kid === defaultKeys.kid) return defaultKeys.publicKeyPem;
        return envKey ?? defaultKeys.publicKeyPem;
      });

      if (!verification.valid) {
        throw new CheckInServiceError(
          `Invalid digital pass: ${verification.reason ?? "signature_mismatch"}`,
          "TOKEN_VERIFICATION_FAILED",
          400,
        );
      }

      letterDoc = await AllocationLetterModel.findOne({
        institution_id: this.instId,
        $or: [{ token: trimmed }, { letter_number: verification.letterId ?? "" }],
      });
    } else {
      // Manual letter code entry (e.g. AL-2026-...)
      letterDoc = await AllocationLetterModel.findOne({
        institution_id: this.instId,
        $or: [{ letter_number: trimmed }, { token: trimmed }],
      });
    }

    if (!letterDoc) {
      throw new CheckInServiceError(
        "Allocation letter not found for this pass code",
        "LETTER_NOT_FOUND",
        404,
      );
    }

    const assignment = await AllocationAssignmentModel.findById(letterDoc.assignment_id);
    if (!assignment) {
      throw new CheckInServiceError(
        "Underlying room assignment not found",
        "ASSIGNMENT_NOT_FOUND",
        404,
      );
    }

    const [hostel, room, bed] = await Promise.all([
      HostelModel.findById(assignment.hostel_id),
      RoomModel.findById(assignment.room_id),
      BedModel.findById(assignment.bed_id),
    ]);

    if (!hostel || !room || !bed) {
      throw new CheckInServiceError(
        "Hostel, room, or bed record missing",
        "RESOURCE_NOT_FOUND",
        404,
      );
    }

    // Resolve hostel checklist template
    const templateItems =
      hostel.inspection_checklist_template && hostel.inspection_checklist_template.length > 0
        ? hostel.inspection_checklist_template.map((t) => ({
            id: t.id,
            label: t.label,
            category: t.category,
            defaultCondition: "good" as ChecklistCondition,
            required: t.required ?? true,
            description: t.description,
          }))
        : DEFAULT_HOSTEL_CHECKLIST_TEMPLATE.map((t) => ({
            id: t.id,
            label: t.label,
            category: t.category,
            defaultCondition: t.defaultCondition ?? "good",
            required: t.required ?? true,
            description: t.description,
          }));

    // Check if existing check-in record exists
    const existing = await CheckInRecordModel.findOne({
      institution_id: this.instId,
      assignment_id: assignment._id,
    });

    return {
      letter: {
        id: letterDoc._id.toString(),
        letterNumber: letterDoc.letter_number,
        token: letterDoc.token,
        studentId: letterDoc.student_id.toString(),
        studentName: letterDoc.metadata.student_name,
        rollNumber: letterDoc.metadata.roll_number,
        studentEmail: letterDoc.metadata.student_email,
        hostelId: hostel._id.toString(),
        hostelName: hostel.name,
        roomId: room._id.toString(),
        roomNumber: room.room_number,
        bedId: bed._id.toString(),
        bedNo: bed.bed_no,
        moveInStartDate: letterDoc.metadata.move_in_start_date,
        moveInEndDate: letterDoc.metadata.move_in_end_date,
      },
      checklistTemplate: templateItems,
      existingRecord: existing
        ? {
            id: existing._id.toString(),
            status: existing.status,
            checkInTime: existing.check_in.time.toISOString(),
            studentAcknowledged: Boolean(existing.student_acknowledgement?.acknowledged),
          }
        : undefined,
    };
  }

  /**
   * Records digital check-in with warden details and room-condition checklist.
   */
  async recordCheckIn(
    input: RecordCheckInInput,
    actor: WorkflowActor,
  ): Promise<CheckInRecordDocument> {
    const verified = await this.verifyAndPrepareCheckIn(input.tokenOrCode);

    // If clientSyncId is provided, check if already recorded idempotently
    if (input.clientSyncId) {
      const existingSync = await CheckInRecordModel.findOne({
        institution_id: this.instId,
        "offline_metadata.client_sync_id": input.clientSyncId,
      });
      if (existingSync) {
        return existingSync;
      }
    }

    const existing = await CheckInRecordModel.findOne({
      institution_id: this.instId,
      student_id: new Types.ObjectId(verified.letter.studentId),
      status: { $in: ["checked_in", "checked_out"] },
    });

    if (existing) {
      throw new CheckInServiceError(
        `Student is already checked in (Record: ${existing._id.toString()}, Status: ${existing.status})`,
        "ALREADY_CHECKED_IN",
        409,
      );
    }

    const assignment = await AllocationAssignmentModel.findOne({
      institution_id: this.instId,
      student_id: new Types.ObjectId(verified.letter.studentId),
    });

    if (!assignment) {
      throw new CheckInServiceError("Active assignment not found", "ASSIGNMENT_NOT_FOUND", 404);
    }

    const checklistDocs: IChecklistItemDoc[] = input.checklist.map((c) => ({
      item_id: c.itemId,
      label: c.label,
      category: c.category,
      condition: c.condition,
      notes: c.notes,
      photo_s3_key: c.photoS3Key,
      photo_url: c.photoUrl,
    }));

    const isOffline = Boolean(input.clientSyncId || input.clientScannedAt);
    const checkInTime = input.clientScannedAt ?? new Date();

    const record = await CheckInRecordModel.create({
      institution_id: this.instId,
      draft_id: assignment.draft_id,
      assignment_id: assignment._id,
      student_id: assignment.student_id,
      hostel_id: assignment.hostel_id,
      room_id: assignment.room_id,
      bed_id: assignment.bed_id,
      letter_id: verified.letter.id,
      letter_number: verified.letter.letterNumber,
      token: verified.letter.token,
      status: "checked_in",
      check_in: {
        warden_id: new Types.ObjectId(actor.id),
        warden_name: actor.name || actor.email,
        time: checkInTime,
        notes: input.notes,
      },
      room_condition_checklist: checklistDocs,
      student_acknowledgement: {
        acknowledged: false,
      },
      offline_metadata: isOffline
        ? {
            scanned_offline: true,
            client_scanned_at: input.clientScannedAt,
            synced_at: new Date(),
            client_sync_id: input.clientSyncId,
          }
        : undefined,
    });

    // Append cryptographic audit log
    await this.getAudit().append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: isOffline ? "OFFLINE_CHECKIN_SYNCED" : "CHECKIN_RECORDED",
      target: {
        check_in_record_id: record._id.toString(),
        assignment_id: assignment._id.toString(),
        student_id: assignment.student_id.toString(),
        room_number: verified.letter.roomNumber,
        bed_no: verified.letter.bedNo,
      },
      after: {
        status: "checked_in",
        items_count: checklistDocs.length,
        is_offline: isOffline,
      },
      timestamp: checkInTime,
    });

    return record;
  }

  /**
   * Student acknowledges the room-condition checklist on their phone.
   */
  async recordStudentAcknowledgement(
    checkInRecordId: string | Types.ObjectId,
    studentUserId: string,
    input: { studentNotes?: string | undefined; signatureHash?: string | undefined } = {},
  ): Promise<CheckInRecordDocument> {
    const record = await CheckInRecordModel.findOne({
      _id: checkInRecordId,
      institution_id: this.instId,
    });

    if (!record) {
      throw new CheckInServiceError("Check-in record not found", "RECORD_NOT_FOUND", 404);
    }

    if (record.student_id.toString() !== studentUserId) {
      throw new CheckInServiceError(
        "Only the allocated student can acknowledge this checklist",
        "FORBIDDEN",
        403,
      );
    }

    record.student_acknowledgement = {
      acknowledged: true,
      acknowledged_at: new Date(),
      student_notes: input.studentNotes,
      signature_hash: input.signatureHash,
    };

    await record.save();

    await this.getAudit().append({
      actor: { user_id: studentUserId, email: "student@campus.edu", roles: ["student"] },
      action: "STUDENT_CHECKLIST_ACKNOWLEDGED",
      target: {
        check_in_record_id: record._id.toString(),
        student_id: record.student_id.toString(),
      },
      after: {
        acknowledged: true,
        acknowledged_at: record.student_acknowledgement.acknowledged_at?.toISOString(),
      },
    });

    return record;
  }

  /**
   * Records check-out inspection, repeats the checklist, computes condition differences,
   * and highlights liability if conditions worsened.
   */
  async recordCheckOut(
    checkInRecordId: string | Types.ObjectId,
    input: RecordCheckOutInput,
    actor: WorkflowActor,
  ): Promise<{ record: CheckInRecordDocument; diffReport: ChecklistDiffReport }> {
    const record = await CheckInRecordModel.findOne({
      _id: checkInRecordId,
      institution_id: this.instId,
    });

    if (!record) {
      throw new CheckInServiceError("Check-in record not found", "RECORD_NOT_FOUND", 404);
    }

    if (record.status !== "checked_in") {
      throw new CheckInServiceError(
        `Cannot check out a record with status: ${record.status}`,
        "INVALID_STATE",
        400,
      );
    }

    // Convert existing check-in checklist to domain records
    const checkInDomainItems: ChecklistItemRecord[] = record.room_condition_checklist.map((c) => ({
      itemId: c.item_id,
      label: c.label,
      category: c.category,
      condition: c.condition,
      notes: c.notes,
      photoS3Key: c.photo_s3_key,
      photoUrl: c.photo_url,
    }));

    const checkOutDomainItems: ChecklistItemRecord[] = input.checklist.map((c) => ({
      itemId: c.itemId,
      label: c.label,
      category: c.category,
      condition: c.condition,
      notes: c.notes,
      photoS3Key: c.photoS3Key,
      photoUrl: c.photoUrl,
    }));

    const diffReport = computeChecklistDiff(checkInDomainItems, checkOutDomainItems);

    const checkOutTime = new Date();

    record.status = "checked_out";
    record.check_out = {
      warden_id: new Types.ObjectId(actor.id),
      warden_name: actor.name || actor.email,
      time: checkOutTime,
      checklist: input.checklist.map((c) => ({
        item_id: c.itemId,
        label: c.label,
        category: c.category,
        condition: c.condition,
        notes: c.notes,
        photo_s3_key: c.photoS3Key,
        photo_url: c.photoUrl,
      })),
      differences: diffReport.differences.map((d) => ({
        item_id: d.itemId,
        label: d.label,
        category: d.category,
        check_in_condition: d.checkInCondition,
        check_out_condition: d.checkOutCondition,
        worsened: d.worsened,
        liability_assessed: d.liabilityAssessed,
        notes: d.checkOutNotes,
        photo_url: d.checkOutPhotoUrl,
      })),
      damage_liability_flag: diffReport.hasDamageLiability,
      notes: input.notes,
    };

    await record.save();

    await this.getAudit().append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "CHECKOUT_RECORDED",
      target: {
        check_in_record_id: record._id.toString(),
        assignment_id: record.assignment_id.toString(),
        student_id: record.student_id.toString(),
      },
      after: {
        status: "checked_out",
        worsened_items: diffReport.worsenedItems,
        damage_liability_flag: diffReport.hasDamageLiability,
      },
      timestamp: checkOutTime,
    });

    return { record, diffReport };
  }

  /**
   * No-show rule:
   * If student has not checked in by deadline, warden marks no-show.
   * Vacates the bed and automatically triggers waitlist promotion.
   */
  async markNoShow(
    letterNumberOrAssignmentId: string,
    reason: string,
    actor: WorkflowActor,
  ): Promise<{
    record: CheckInRecordDocument;
    promotionResult: unknown;
  }> {
    if (!reason || reason.trim().length === 0) {
      throw new CheckInServiceError(
        "A valid reason is required for no-show marking",
        "REASON_REQUIRED",
        400,
      );
    }

    // Lookup letter
    const letter = await AllocationLetterModel.findOne({
      institution_id: this.instId,
      $or: [
        { letter_number: letterNumberOrAssignmentId },
        {
          _id: Types.ObjectId.isValid(letterNumberOrAssignmentId)
            ? letterNumberOrAssignmentId
            : undefined,
        },
        {
          assignment_id: Types.ObjectId.isValid(letterNumberOrAssignmentId)
            ? letterNumberOrAssignmentId
            : undefined,
        },
      ].filter(Boolean),
    });

    if (!letter) {
      throw new CheckInServiceError("Allocation letter not found", "LETTER_NOT_FOUND", 404);
    }

    // Check if student is already checked in
    const existing = await CheckInRecordModel.findOne({
      institution_id: this.instId,
      assignment_id: letter.assignment_id,
    });

    if (existing && existing.status === "checked_in") {
      throw new CheckInServiceError(
        "Cannot mark no-show: Student is already checked in",
        "ALREADY_CHECKED_IN",
        400,
      );
    }

    const assignment = await AllocationAssignmentModel.findById(letter.assignment_id);
    if (!assignment) {
      throw new CheckInServiceError("Assignment record not found", "ASSIGNMENT_NOT_FOUND", 404);
    }

    // If draft is published, amend draft first to permit post-publication adjustments per Layer c
    let activeDraftId = letter.draft_id;
    const draftDoc = await AllocationDraftModel.findById(letter.draft_id);
    if (draftDoc && (draftDoc.status === "PUBLISHED" || draftDoc.status === "published")) {
      const draftWorkflow = new DraftWorkflowService();
      const { newDraft } = await draftWorkflow.amendDraft(
        letter.draft_id,
        actor,
        `Student no-show: ${reason}`,
      );
      activeDraftId = newDraft._id;
    }

    // Call PromotionService to handle vacated bed and trigger waitlist promotion
    const promoService = new PromotionService();
    const promotion = await promoService.handleVacatedBed(
      activeDraftId,
      assignment.bed_id,
      "no_show",
      actor,
      { reason: `Student no-show: ${reason}` },
    );

    let promotedStudentId: Types.ObjectId | undefined;
    if (promotion.promotionResult.promotedStudentId) {
      promotedStudentId = new Types.ObjectId(promotion.promotionResult.promotedStudentId);
    }

    let record: CheckInRecordDocument;
    if (existing) {
      existing.status = "no_show";
      existing.no_show = {
        marked_by_warden_id: new Types.ObjectId(actor.id),
        marked_at: new Date(),
        reason,
        promotion_triggered: true,
        promoted_student_id: promotedStudentId,
      };
      record = await existing.save();
    } else {
      record = await CheckInRecordModel.create({
        institution_id: this.instId,
        draft_id: letter.draft_id,
        assignment_id: assignment._id,
        student_id: letter.student_id,
        hostel_id: assignment.hostel_id,
        room_id: assignment.room_id,
        bed_id: assignment.bed_id,
        letter_id: letter._id.toString(),
        letter_number: letter.letter_number,
        token: letter.token,
        status: "no_show",
        check_in: {
          warden_id: new Types.ObjectId(actor.id),
          warden_name: actor.name || actor.email,
          time: new Date(),
          notes: `No-show recorded: ${reason}`,
        },
        room_condition_checklist: [],
        no_show: {
          marked_by_warden_id: new Types.ObjectId(actor.id),
          marked_at: new Date(),
          reason,
          promotion_triggered: true,
          promoted_student_id: promotedStudentId,
        },
      });
    }

    await this.getAudit().append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "NO_SHOW_MARKED",
      target: {
        check_in_record_id: record._id.toString(),
        student_id: letter.student_id.toString(),
        bed_id: assignment.bed_id.toString(),
      },
      after: {
        status: "no_show",
        reason,
        promotion_action: promotion.promotionResult.action,
        promoted_student_id: promotion.promotionResult.promotedStudentId,
      },
    });

    return {
      record,
      promotionResult: promotion,
    };
  }

  /**
   * Batch sync offline check-in records when client returns online.
   */
  async syncOfflineCheckIns(
    records: RecordCheckInInput[],
    actor: WorkflowActor,
  ): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: Array<{ code: string; message: string }>;
  }> {
    let syncedCount = 0;
    let failedCount = 0;
    const errors: Array<{ code: string; message: string }> = [];

    for (const rec of records) {
      try {
        await this.recordCheckIn(rec, actor);
        syncedCount++;
      } catch (err: unknown) {
        failedCount++;
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ code: rec.clientSyncId ?? rec.tokenOrCode, message });
      }
    }

    return { syncedCount, failedCount, errors };
  }
}
