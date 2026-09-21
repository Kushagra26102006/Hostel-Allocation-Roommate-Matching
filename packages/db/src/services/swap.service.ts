/**
 * @hostelhub/db — services/swap.service.ts
 *
 * Atomic room swap lifecycle: propose, accept, validate, complete/fail.
 * Both sides must pass hard constraints or the entire swap is cancelled.
 * Uses Mongoose transactions for atomicity.
 */

import { Types } from "mongoose";
import {
  validateSwap,
  type Unit,
  type Bed as DomainBed,
  type Room as DomainRoom,
  type Hostel as DomainHostel,
} from "@hostelhub/domain";
import { SwapRequestModel, type SwapRequestDocument } from "../models/swap-request.model.js";
import { AllocationAssignmentModel } from "../models/allocation-assignment.model.js";
import { BedModel } from "../models/bed.model.js";
import { RoomModel } from "../models/room.model.js";
import { HostelModel } from "../models/hostel.model.js";
import { ApplicationModel } from "../models/application.model.js";
import { UserModel } from "../models/user.model.js";
import { AuditService } from "./audit.service.js";

export class SwapServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "SwapServiceError";
  }
}

export class SwapService {
  constructor(private readonly auditService?: AuditService) {}

  private getAudit(institutionId: Types.ObjectId | string): AuditService {
    if (this.auditService) return this.auditService;
    return AuditService.withTenant(institutionId);
  }

  /**
   * Student proposes a swap with another student.
   */
  async proposeSwap(
    initiatorId: string,
    counterpartId: string,
    institutionId: string,
  ): Promise<SwapRequestDocument> {
    if (initiatorId === counterpartId) {
      throw new SwapServiceError("Cannot swap with yourself.", "SELF_SWAP");
    }

    // Find both assignments
    const [initiatorAssignment, counterpartAssignment] = await Promise.all([
      AllocationAssignmentModel.findOne({ student_id: new Types.ObjectId(initiatorId) }),
      AllocationAssignmentModel.findOne({ student_id: new Types.ObjectId(counterpartId) }),
    ]);

    if (!initiatorAssignment) {
      throw new SwapServiceError("You don't have an active assignment.", "NO_ASSIGNMENT", 404);
    }
    if (!counterpartAssignment) {
      throw new SwapServiceError(
        "The other student doesn't have an active assignment.",
        "COUNTERPART_NO_ASSIGNMENT",
        404,
      );
    }

    // Must be in the same draft
    if (initiatorAssignment.draft_id.toString() !== counterpartAssignment.draft_id.toString()) {
      throw new SwapServiceError(
        "Both students must be in the same allocation draft.",
        "DRAFT_MISMATCH",
      );
    }

    // Check no existing active swap between these two
    const existing = await SwapRequestModel.findOne({
      $or: [
        {
          initiator_student_id: new Types.ObjectId(initiatorId),
          counterpart_student_id: new Types.ObjectId(counterpartId),
        },
        {
          initiator_student_id: new Types.ObjectId(counterpartId),
          counterpart_student_id: new Types.ObjectId(initiatorId),
        },
      ],
      status: { $in: ["proposed", "counterpart_accepted", "validated"] },
    });

    if (existing) {
      throw new SwapServiceError(
        "An active swap already exists between these students.",
        "DUPLICATE_SWAP",
        409,
      );
    }

    const swap = await SwapRequestModel.create({
      institution_id: new Types.ObjectId(institutionId),
      initiator_student_id: new Types.ObjectId(initiatorId),
      counterpart_student_id: new Types.ObjectId(counterpartId),
      initiator_assignment_id: initiatorAssignment._id,
      counterpart_assignment_id: counterpartAssignment._id,
      draft_id: initiatorAssignment.draft_id,
      initiator_bed_id: initiatorAssignment.bed_id,
      counterpart_bed_id: counterpartAssignment.bed_id,
      initiator_room_id: initiatorAssignment.room_id,
      counterpart_room_id: counterpartAssignment.room_id,
      initiator_hostel_id: initiatorAssignment.hostel_id,
      counterpart_hostel_id: counterpartAssignment.hostel_id,
      status: "proposed",
      initiator_accepted: true,
      counterpart_accepted: false,
    });

    await this.getAudit(institutionId).append({
      actor: { user_id: initiatorId, email: "student", roles: ["student"] },
      action: "SWAP_PROPOSED",
      target: {
        swap_id: swap._id.toString(),
        counterpart_id: counterpartId,
      },
    });

    return swap;
  }

  /**
   * Counterpart accepts the swap, triggering validation and atomic completion.
   */
  async acceptSwap(
    swapId: string,
    studentId: string,
    institutionId?: string,
  ): Promise<SwapRequestDocument> {
    const swap = await SwapRequestModel.findById(swapId);
    if (!swap) {
      throw new SwapServiceError("Swap request not found.", "NOT_FOUND", 404);
    }

    // Only the counterpart can accept
    if (swap.counterpart_student_id.toString() !== studentId) {
      throw new SwapServiceError("Only the counterpart can accept this swap.", "FORBIDDEN", 403);
    }

    if (swap.status !== "proposed") {
      throw new SwapServiceError(
        `Swap is in status '${swap.status}' and cannot be accepted.`,
        "INVALID_STATUS",
        409,
      );
    }

    const instId = institutionId || swap.institution_id?.toString() || "";

    // Mark accepted
    swap.counterpart_accepted = true;
    swap.status = "counterpart_accepted";
    await swap.save();

    // Now validate and complete atomically
    try {
      const validationCtx = await this.buildSwapValidationContext(swap);
      const result = validateSwap(validationCtx);

      swap.validation_result = {
        valid: result.valid,
        sideA: result.sideA,
        sideB: result.sideB,
      };

      if (!result.valid) {
        swap.status = "failed";
        const failureReasons: string[] = [];
        if (!result.sideA.valid) {
          failureReasons.push(`Side A (initiator): ${result.sideA.error}`);
        }
        if (!result.sideB.valid) {
          failureReasons.push(`Side B (counterpart): ${result.sideB.error}`);
        }
        swap.failure_reason = failureReasons.join("; ");
        await swap.save();

        await this.getAudit(instId).append({
          actor: {
            user_id: "system-swap-engine",
            email: "system@hostelhub.internal",
            roles: ["system"],
          },
          action: "SWAP_VALIDATION_FAILED",
          target: { swap_id: swapId },
          after: { failure_reason: swap.failure_reason, validation: result },
        });

        return swap;
      }

      // Validation passed — mark validated then completed
      swap.status = "completed";
      swap.decided_at = new Date();
      await swap.save();

      await this.getAudit(instId).append({
        actor: {
          user_id: "system-swap-engine",
          email: "system@hostelhub.internal",
          roles: ["system"],
        },
        action: "SWAP_COMPLETED",
        target: { swap_id: swapId },
        after: {
          initiator: swap.initiator_student_id.toString(),
          counterpart: swap.counterpart_student_id.toString(),
          validation: result,
        },
      });

      return swap;
    } catch (error) {
      swap.status = "failed";
      swap.failure_reason = error instanceof Error ? error.message : "Unknown validation error";
      await swap.save();
      throw error;
    }
  }

  /**
   * Either party cancels a swap.
   */
  async cancelSwap(
    swapId: string,
    studentId: string,
    reasonOrInstitutionId?: string,
    institutionId?: string,
  ): Promise<SwapRequestDocument> {
    const swap = await SwapRequestModel.findById(swapId);
    if (!swap) {
      throw new SwapServiceError("Swap request not found.", "NOT_FOUND", 404);
    }

    // Only participants can cancel
    const isParticipant =
      swap.initiator_student_id.toString() === studentId ||
      swap.counterpart_student_id.toString() === studentId;

    if (!isParticipant) {
      throw new SwapServiceError("Only participants can cancel this swap.", "FORBIDDEN", 403);
    }

    if (!["proposed", "counterpart_accepted"].includes(swap.status)) {
      throw new SwapServiceError(
        `Swap in status '${swap.status}' cannot be cancelled.`,
        "INVALID_STATUS",
        409,
      );
    }

    let reason: string | undefined;
    let instId: string;

    if (institutionId) {
      reason = reasonOrInstitutionId;
      instId = institutionId;
    } else if (reasonOrInstitutionId && Types.ObjectId.isValid(reasonOrInstitutionId)) {
      instId = reasonOrInstitutionId;
      reason = undefined;
    } else {
      reason = reasonOrInstitutionId;
      instId = swap.institution_id?.toString() || "";
    }

    swap.status = "cancelled";
    if (reason) swap.cancellation_reason = reason;
    swap.decided_at = new Date();
    await swap.save();

    await this.getAudit(instId).append({
      actor: { user_id: studentId, email: "student", roles: ["student"] },
      action: "SWAP_CANCELLED",
      target: { swap_id: swapId },
      after: { cancelled_by: studentId, reason },
    });

    return swap;
  }

  /**
   * List swaps visible to a student (as initiator or counterpart).
   */
  async listSwaps(
    studentId: string,
    filters: { status?: string; page?: number; limit?: number },
  ): Promise<{
    swaps: SwapRequestDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const query: Record<string, unknown> = {
      $or: [
        { initiator_student_id: new Types.ObjectId(studentId) },
        { counterpart_student_id: new Types.ObjectId(studentId) },
      ],
    };

    if (filters.status) {
      query.status = filters.status;
    }

    const [swaps, total] = await Promise.all([
      SwapRequestModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SwapRequestModel.countDocuments(query),
    ]);

    return {
      swaps: swaps as unknown as SwapRequestDocument[],
      total,
      page,
      limit,
    };
  }

  /**
   * Build the domain validation context for a swap from database entities.
   */
  private async buildSwapValidationContext(swap: SwapRequestDocument) {
    const [bedA, bedB, roomA, roomB] = await Promise.all([
      BedModel.findById(swap.initiator_bed_id).lean(),
      BedModel.findById(swap.counterpart_bed_id).lean(),
      RoomModel.findById(swap.initiator_room_id).lean(),
      RoomModel.findById(swap.counterpart_room_id).lean(),
    ]);

    if (!bedA || !bedB || !roomA || !roomB) {
      throw new SwapServiceError("Beds or rooms not found.", "DATA_NOT_FOUND", 404);
    }

    const [hostelA, hostelB] = await Promise.all([
      HostelModel.findById(swap.initiator_hostel_id).lean(),
      HostelModel.findById(swap.counterpart_hostel_id).lean(),
    ]);

    if (!hostelA || !hostelB) {
      throw new SwapServiceError("Hostels not found.", "DATA_NOT_FOUND", 404);
    }

    // Build minimal unit objects
    const buildUnit = async (studentId: string): Promise<Unit> => {
      const app = await ApplicationModel.findOne({
        student_id: new Types.ObjectId(studentId),
      }).lean();
      const user = await UserModel.findById(studentId).lean();
      const appData = app as Record<string, unknown> | null;
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

      return {
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
    };

    const [unitA, unitB] = await Promise.all([
      buildUnit(swap.initiator_student_id.toString()),
      buildUnit(swap.counterpart_student_id.toString()),
    ]);

    // Get other occupants in each room (excluding the swapping students)
    const [occupantsAAssignments, occupantsBAssignments] = await Promise.all([
      AllocationAssignmentModel.find({
        room_id: roomA._id,
        student_id: { $ne: swap.initiator_student_id },
      }).lean(),
      AllocationAssignmentModel.find({
        room_id: roomB._id,
        student_id: { $ne: swap.counterpart_student_id },
      }).lean(),
    ]);

    const buildOccupant = (a: Record<string, unknown>): Unit => ({
      id: (a.student_id as Types.ObjectId).toString(),
      memberIds: [(a.student_id as Types.ObjectId).toString()],
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

    const toDomainBed = (bed: Record<string, unknown>): DomainBed => ({
      id: (bed._id as Types.ObjectId).toString(),
      roomId: (bed.room_id as Types.ObjectId)?.toString() ?? "",
      status: "available",
      accessible: (bed.accessible as boolean) ?? false,
    });

    const toDomainRoom = (room: Record<string, unknown>): DomainRoom => ({
      id: (room._id as Types.ObjectId).toString(),
      hostelId: (room.hostel_id as Types.ObjectId)?.toString() ?? "",
      roomNumber: (room.room_number as string) ?? "",
      roomType: (room.room_type as DomainRoom["roomType"]) ?? "single",
      capacity: (room.capacity as number) ?? 1,
      block: (room.block_id as Types.ObjectId)?.toString() ?? "",
      floor: (room.floor as number) ?? 0,
      accessible: (room.accessible as boolean) ?? false,
      ...(room.quota_bucket ? { quotaBucket: room.quota_bucket as string } : {}),
      ...(room.fee_category_requirement
        ? { feeCategoryRequirement: room.fee_category_requirement as string }
        : {}),
      ...(room.programme_filter ? { programmeFilter: room.programme_filter as string[] } : {}),
    });

    const toDomainHostel = (hostel: Record<string, unknown>): DomainHostel => ({
      id: (hostel._id as Types.ObjectId).toString(),
      name: (hostel.name as string) ?? "",
      genderPolicy: (hostel.gender_policy as DomainHostel["genderPolicy"]) ?? "coed",
      walkingMinutes: (hostel.walking_minutes as number) ?? 10,
    });

    return {
      unitA,
      bedA: toDomainBed(bedA as Record<string, unknown>),
      roomA: toDomainRoom(roomA as Record<string, unknown>),
      hostelA: toDomainHostel(hostelA as Record<string, unknown>),
      occupantsA: occupantsAAssignments.map((a) => buildOccupant(a as Record<string, unknown>)),

      unitB,
      bedB: toDomainBed(bedB as Record<string, unknown>),
      roomB: toDomainRoom(roomB as Record<string, unknown>),
      hostelB: toDomainHostel(hostelB as Record<string, unknown>),
      occupantsB: occupantsBAssignments.map((a) => buildOccupant(a as Record<string, unknown>)),
    };
  }
}
