/* eslint-disable no-restricted-imports */
import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiProblemError } from "@/lib/api/errors.js";
import {
  connectDb,
  AllocationDraftModel,
  AllocationAssignmentModel,
  BedModel,
  RoomModel,
  HostelModel,
  ApplicationModel,
} from "@hostelhub/db";
import {
  validateOverride,
  type Unit,
  type Bed as DomainBed,
  type Room as DomainRoom,
  type Hostel as DomainHostel,
  type OverrideInput,
  type OverrideValidationContext,
  type GenderPolicy,
} from "@hostelhub/domain";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const bodySchema = z.object({
  assignmentId: z.string().min(1),
  toBedId: z.string().min(1),
});

export const POST = apiHandler(
  {
    permission: "hostel:review_own",
    params: paramsSchema,
    body: bodySchema,
    operationId: "validateOverrideTarget",
    summary: "Live dry-run validation for prospective override target bed with constraint checks",
  },
  async ({ params, body, institution_id }) => {
    await connectDb();

    const draftId = new Types.ObjectId(params.id);
    const instId = new Types.ObjectId(institution_id);

    const draft = await AllocationDraftModel.findOne({ _id: draftId, institution_id: instId })
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

    const assignment = await AllocationAssignmentModel.findOne({
      _id: new Types.ObjectId(body.assignmentId),
      draft_id: draft._id,
    })
      .lean()
      .exec();

    if (!assignment) {
      throw new ApiProblemError({
        status: 404,
        title: "Not Found",
        detail: "Assignment not found",
        code: "NOT_FOUND",
      });
    }

    const [toBed, fromBed, application] = await Promise.all([
      BedModel.findById(body.toBedId).lean().exec(),
      BedModel.findById(assignment.bed_id).lean().exec(),
      ApplicationModel.findById(assignment.application_id).lean().exec(),
    ]);

    if (!toBed || !fromBed || !application) {
      return {
        valid: false,
        code: "TARGET_NOT_FOUND",
        reason: "Target bed or application record not found",
        escalated: false,
        escalationReasons: [],
      };
    }

    const toRoom = await RoomModel.findById(toBed.room_id).lean().exec();
    if (!toRoom) {
      return {
        valid: false,
        code: "ROOM_NOT_FOUND",
        reason: "Target room not found",
        escalated: false,
        escalationReasons: [],
      };
    }

    const toHostel = await HostelModel.findById(toRoom.hostel_id).lean().exec();
    if (!toHostel) {
      return {
        valid: false,
        code: "HOSTEL_NOT_FOUND",
        reason: "Target hostel not found",
        escalated: false,
        escalationReasons: [],
      };
    }

    const formData = (application.form_data ?? {}) as Record<string, unknown>;
    const personal = (formData.personal_info ?? {}) as Record<string, unknown>;
    const academic = (formData.academic_info ?? {}) as Record<string, unknown>;

    const studentGender = (personal.gender === "female" ? "female" : "male") as "male" | "female";
    const programme = typeof academic.programme === "string" ? academic.programme : "General";
    const year = typeof academic.year === "number" ? academic.year : 1;
    const feeCategory =
      typeof academic.fee_category === "string" ? academic.fee_category : "regular";
    const quotaBucket =
      typeof formData.quota_category === "string" ? formData.quota_category : "General";

    // Prospective roommates
    const existingOccupants = await AllocationAssignmentModel.find({
      draft_id: draft._id,
      room_id: toRoom._id,
      _id: { $ne: assignment._id },
    })
      .lean()
      .exec();

    const targetRoomOccupants: Unit[] = existingOccupants.map((o) => ({
      id: o.student_id.toString(),
      memberIds: [o.student_id.toString()],
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

    const unit: Unit = {
      id: assignment.student_id.toString(),
      memberIds: [assignment.student_id.toString()],
      gender: studentGender,
      programme,
      year,
      feeCategory,
      quotaBucket,
      hasHold: false,
      accessibilityNeed: Boolean(personal.disability_status ?? formData.accessibility_need),
      preferenceHostelIds: [],
      questionnaire: {},
    };

    const fromBedDomain: DomainBed = {
      id: fromBed._id.toString(),
      roomId: fromBed.room_id.toString(),
      accessible: Boolean(fromBed.attributes?.accessible),
      status:
        fromBed.status === "out_of_service"
          ? "out_of_service"
          : fromBed.status === "occupied"
            ? "occupied"
            : fromBed.status === "held"
              ? "reserved"
              : "available",
    };

    const toBedDomain: DomainBed = {
      id: toBed._id.toString(),
      roomId: toBed.room_id.toString(),
      accessible: Boolean(toBed.attributes?.accessible),
      status:
        toBed.status === "out_of_service"
          ? "out_of_service"
          : toBed.status === "occupied"
            ? "occupied"
            : toBed.status === "held"
              ? "reserved"
              : "available",
    };

    const toRoomDomain: DomainRoom = {
      id: toRoom._id.toString(),
      roomNumber: toRoom.room_number,
      hostelId: toRoom.hostel_id.toString(),
      block: toRoom.block_id.toString(),
      floor: 1,
      capacity: toRoom.capacity,
      roomType: toRoom.room_type,
      accessible: toRoom.accessible,
    };

    const toHostelDomain: DomainHostel = {
      id: toHostel._id.toString(),
      name: toHostel.name,
      genderPolicy: toHostel.gender_policy as GenderPolicy,
      walkingMinutes: 5,
    };

    const validationInput: OverrideInput = {
      draftId: draft._id.toString(),
      assignmentId: assignment._id.toString(),
      applicationId: assignment.application_id.toString(),
      studentId: assignment.student_id.toString(),
      fromBedId: fromBed._id.toString(),
      toBedId: toBed._id.toString(),
      reason: "Live preview dry run validation",
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

    const res = validateOverride(validationInput, validationContext);

    return {
      valid: res.valid,
      code: res.code ?? null,
      reason: res.error ?? null,
      escalated: res.escalated,
      escalationReasons: res.escalationReasons,
    };
  },
);
