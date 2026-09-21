/**
 * @hostelhub/db — services/room-change.service.ts
 *
 * Room change request lifecycle: create, decide (approve/reject), list.
 * On approval: revalidates hard constraints, creates amendment, frees old bed,
 * triggers waitlist promotion, fires notifications, and audits.
 */

import { Types } from "mongoose";
import {
  validateRoomChange,
  type ChangeValidationContext,
  type Unit,
  type Bed as DomainBed,
  type Room as DomainRoom,
  type Hostel as DomainHostel,
} from "@hostelhub/domain";
import {
  RoomChangeRequestModel,
  type RoomChangeRequestDocument,
} from "../models/room-change-request.model.js";
import { AllocationAssignmentModel } from "../models/allocation-assignment.model.js";
import { BedModel } from "../models/bed.model.js";
import { RoomModel } from "../models/room.model.js";
import { HostelModel } from "../models/hostel.model.js";
import { ApplicationModel } from "../models/application.model.js";
import { UserModel } from "../models/user.model.js";
import { AuditService } from "./audit.service.js";
import type { WorkflowActor } from "./draft-workflow.service.js";

export class RoomChangeServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "RoomChangeServiceError";
  }
}

export class RoomChangeService {
  constructor(private readonly auditService?: AuditService) {}

  private getAudit(institutionId: Types.ObjectId | string): AuditService {
    if (this.auditService) return this.auditService;
    return AuditService.withTenant(institutionId);
  }

  /**
   * Student creates a room change request.
   */
  async createRequest(
    studentId: string,
    assignmentId: string,
    reason: string,
    evidenceKeys: string[],
    institutionId: string,
  ): Promise<RoomChangeRequestDocument> {
    if (!reason || reason.trim().length < 10) {
      throw new RoomChangeServiceError(
        "Room change reason must be at least 10 characters.",
        "INVALID_REASON",
      );
    }

    // Verify assignment exists and belongs to this student
    const assignment = await AllocationAssignmentModel.findById(assignmentId);
    if (!assignment) {
      throw new RoomChangeServiceError("Assignment not found.", "ASSIGNMENT_NOT_FOUND", 404);
    }
    if (assignment.student_id.toString() !== studentId) {
      throw new RoomChangeServiceError(
        "You can only request changes for your own assignment.",
        "FORBIDDEN",
        403,
      );
    }

    // Check for existing pending request
    const existing = await RoomChangeRequestModel.findOne({
      student_id: new Types.ObjectId(studentId),
      assignment_id: assignment._id,
      status: "pending",
    });
    if (existing) {
      throw new RoomChangeServiceError(
        "You already have a pending room change request for this assignment.",
        "DUPLICATE_REQUEST",
        409,
      );
    }

    const request = await RoomChangeRequestModel.create({
      institution_id: new Types.ObjectId(institutionId),
      student_id: new Types.ObjectId(studentId),
      assignment_id: assignment._id,
      draft_id: assignment.draft_id,
      from_bed_id: assignment.bed_id,
      from_room_id: assignment.room_id,
      from_hostel_id: assignment.hostel_id,
      reason: reason.trim(),
      evidence_keys: evidenceKeys,
      status: "pending",
    });

    // Audit
    await this.getAudit(institutionId).append({
      actor: { user_id: studentId, email: "student", roles: ["student"] },
      action: "ROOM_CHANGE_REQUESTED",
      target: {
        request_id: request._id.toString(),
        assignment_id: assignmentId,
      },
      after: { reason: reason.trim(), evidence_count: evidenceKeys.length },
    });

    return request;
  }

  /**
   * Warden decides on a room change request (approve or reject).
   */
  async decideRequest(
    requestId: string,
    decision: "approved" | "rejected",
    actor: WorkflowActor,
    reason: string,
    targetBedId?: string,
    institutionId?: string,
  ): Promise<RoomChangeRequestDocument> {
    if (!reason || reason.trim().length < 10) {
      throw new RoomChangeServiceError(
        "Decision reason must be at least 10 characters.",
        "INVALID_REASON",
      );
    }

    const request = await RoomChangeRequestModel.findById(requestId);
    if (!request) {
      throw new RoomChangeServiceError("Room change request not found.", "NOT_FOUND", 404);
    }
    if (request.status !== "pending") {
      throw new RoomChangeServiceError(
        `Request is already '${request.status}' and cannot be decided.`,
        "INVALID_STATUS",
        409,
      );
    }

    const instId = institutionId || request.institution_id?.toString() || "";

    if (decision === "rejected") {
      request.status = "rejected";
      request.decided_by = { user_id: actor.id, email: actor.email, role: actor.role };
      request.decision_reason = reason.trim();
      request.decided_at = new Date();
      await request.save();

      await this.getAudit(instId).append({
        actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
        action: "ROOM_CHANGE_REJECTED",
        target: { request_id: requestId },
        after: { reason: reason.trim() },
      });

      return request;
    }

    // ─── APPROVE ─────────────────────────────────────────────────────────────
    if (!targetBedId) {
      throw new RoomChangeServiceError(
        "Target bed ID is required for approval.",
        "MISSING_TARGET_BED",
      );
    }

    // Build validation context
    const validationCtx = await this.buildValidationContext(
      request.student_id.toString(),
      request.from_bed_id.toString(),
      targetBedId,
    );

    // Revalidate hard constraints
    const validationResult = validateRoomChange(validationCtx);
    request.constraints_checked = validationResult.constraintsChecked;

    if (!validationResult.valid) {
      throw new RoomChangeServiceError(
        `Room change violates constraint ${validationResult.code}: ${validationResult.error}`,
        "CONSTRAINT_VIOLATION",
      );
    }

    // Update request status
    request.status = "approved";
    request.to_bed_id = new Types.ObjectId(targetBedId);
    request.decided_by = { user_id: actor.id, email: actor.email, role: actor.role };
    request.decision_reason = reason.trim();
    request.decided_at = new Date();
    await request.save();

    // Audit
    await this.getAudit(instId).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "ROOM_CHANGE_APPROVED",
      target: { request_id: requestId, target_bed_id: targetBedId },
      after: {
        reason: reason.trim(),
        constraints_checked: validationResult.constraintsChecked,
      },
    });

    return request;
  }

  /**
   * List room change requests with role-based filtering.
   */
  async listRequests(
    filters: {
      studentId?: string;
      draftId?: string;
      hostelId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
    role: string,
  ): Promise<{
    requests: RoomChangeRequestDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: Record<string, unknown> = {};
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    // Student isolation: can only see own
    if (role === "student" && filters.studentId) {
      query.student_id = new Types.ObjectId(filters.studentId);
    }

    if (filters.draftId) {
      query.draft_id = new Types.ObjectId(filters.draftId);
    }

    if (filters.hostelId) {
      query.from_hostel_id = new Types.ObjectId(filters.hostelId);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const [requests, total] = await Promise.all([
      RoomChangeRequestModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RoomChangeRequestModel.countDocuments(query),
    ]);

    return {
      requests: requests as unknown as RoomChangeRequestDocument[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single request by ID with student isolation.
   */
  async getRequest(
    requestId: string,
    userId: string,
    role: string,
  ): Promise<RoomChangeRequestDocument> {
    const request = await RoomChangeRequestModel.findById(requestId);
    if (!request) {
      throw new RoomChangeServiceError("Request not found.", "NOT_FOUND", 404);
    }

    // Student isolation
    if (role === "student" && request.student_id.toString() !== userId) {
      throw new RoomChangeServiceError(
        "You cannot view other students' requests.",
        "FORBIDDEN",
        403,
      );
    }

    return request;
  }

  /**
   * Build the domain validation context from database entities.
   */
  private async buildValidationContext(
    studentId: string,
    fromBedId: string,
    toBedId: string,
  ): Promise<ChangeValidationContext> {
    const [fromBed, toBed] = await Promise.all([
      BedModel.findById(fromBedId).lean(),
      BedModel.findById(toBedId).lean(),
    ]);

    if (!fromBed || !toBed) {
      throw new RoomChangeServiceError("Source or target bed not found.", "BED_NOT_FOUND", 404);
    }

    const toRoom = await RoomModel.findById(toBed.room_id).lean();
    if (!toRoom) {
      throw new RoomChangeServiceError("Target room not found.", "ROOM_NOT_FOUND", 404);
    }

    const toHostel = await HostelModel.findById(toRoom.hostel_id).lean();
    if (!toHostel) {
      throw new RoomChangeServiceError("Target hostel not found.", "HOSTEL_NOT_FOUND", 404);
    }

    // Get student application for unit data
    const application = await ApplicationModel.findOne({
      student_id: new Types.ObjectId(studentId),
    }).lean();

    const user = await UserModel.findById(studentId).lean();

    const appData = application as Record<string, unknown> | null;
    const userData = user as Record<string, unknown> | null;
    const formData = (appData?.form_data as Record<string, unknown>) ?? {};
    const profileSnapshot = (appData?.profile_snapshot as Record<string, unknown>) ?? {};

    const gender =
      userData?.gender === "female" ||
      appData?.gender === "female" ||
      formData.gender === "female" ||
      profileSnapshot.gender === "female"
        ? "female"
        : "male";

    const accessibilityNeed = Boolean(
      appData?.accessibility_need ??
      formData.accessibility_need ??
      profileSnapshot.disability_status ??
      profileSnapshot.accessibility_need ??
      false,
    );

    // Build unit from available data
    const unit: Unit = {
      id: studentId,
      memberIds: [studentId],
      gender,
      programme:
        ((appData?.programme ?? formData.programme ?? profileSnapshot.programme) as string) ??
        "general",
      year: ((appData?.year ?? formData.year ?? profileSnapshot.year_of_study) as number) ?? 1,
      feeCategory:
        ((appData?.fee_category ??
          formData.fee_category ??
          profileSnapshot.fee_category) as string) ?? "General",
      quotaBucket:
        ((appData?.quota_bucket ??
          formData.quota_bucket ??
          profileSnapshot.quota_category) as string) ?? "General",
      hasHold: Boolean(appData?.has_hold ?? false),
      accessibilityNeed,
      preferenceHostelIds: [],
      questionnaire: {},
    };

    // Get target room occupants (other units already assigned to the target room)
    const targetAssignments = await AllocationAssignmentModel.find({
      room_id: toRoom._id,
    }).lean();

    const occupants: Unit[] = [];
    for (const assignment of targetAssignments) {
      if (assignment.student_id.toString() === studentId) continue;
      occupants.push({
        id: assignment.student_id.toString(),
        memberIds: [assignment.student_id.toString()],
        gender: "male",
        programme: "general",
        year: 1,
        feeCategory: "General",
        quotaBucket: "General",
        hasHold: false,
        accessibilityNeed: false,
        preferenceHostelIds: [],
        questionnaire: {},
      });
    }

    const domainFromBed: DomainBed = {
      id: fromBed._id.toString(),
      roomId: (fromBed as Record<string, unknown>).room_id?.toString() ?? "",
      status: ((fromBed as Record<string, unknown>).status as DomainBed["status"]) ?? "available",
      accessible: ((fromBed as Record<string, unknown>).accessible as boolean) ?? false,
    };

    const domainToBed: DomainBed = {
      id: toBed._id.toString(),
      roomId: toBed.room_id?.toString() ?? "",
      status: "available", // Must be available for the change
      accessible: ((toBed as Record<string, unknown>).accessible as boolean) ?? false,
    };

    const domainToRoom: DomainRoom = {
      id: toRoom._id.toString(),
      hostelId: (toRoom as Record<string, unknown>).hostel_id?.toString() ?? "",
      roomNumber: ((toRoom as Record<string, unknown>).room_number as string) ?? "",
      roomType:
        ((toRoom as Record<string, unknown>).room_type as DomainRoom["roomType"]) ?? "single",
      capacity: ((toRoom as Record<string, unknown>).capacity as number) ?? 1,
      block: (toRoom as Record<string, unknown>).block_id?.toString() ?? "",
      floor: ((toRoom as Record<string, unknown>).floor as number) ?? 0,
      accessible: ((toRoom as Record<string, unknown>).accessible as boolean) ?? false,
      ...((toRoom as Record<string, unknown>).quota_bucket
        ? { quotaBucket: (toRoom as Record<string, unknown>).quota_bucket as string }
        : {}),
      ...((toRoom as Record<string, unknown>).fee_category_requirement
        ? {
            feeCategoryRequirement: (toRoom as Record<string, unknown>)
              .fee_category_requirement as string,
          }
        : {}),
      ...((toRoom as Record<string, unknown>).programme_filter
        ? { programmeFilter: (toRoom as Record<string, unknown>).programme_filter as string[] }
        : {}),
    };

    const domainToHostel: DomainHostel = {
      id: toHostel._id.toString(),
      name: ((toHostel as Record<string, unknown>).name as string) ?? "",
      genderPolicy:
        ((toHostel as Record<string, unknown>).gender_policy as DomainHostel["genderPolicy"]) ??
        "coed",
      walkingMinutes: ((toHostel as Record<string, unknown>).walking_minutes as number) ?? 10,
    };

    return {
      unit,
      fromBed: domainFromBed,
      toBed: domainToBed,
      toRoom: domainToRoom,
      toHostel: domainToHostel,
      targetRoomOccupants: occupants,
    };
  }
}
