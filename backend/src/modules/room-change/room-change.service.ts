import { Types } from "mongoose";
import {
  RoomChangeRequestModel,
  BedModel,
  AllocationAssignmentModel,
  RoomModel,
  type IRoomChangeRequest,
  type RoomChangeRequestDocument,
} from "@hostelhub/db";
import { NotFoundError, BadRequestError, ConflictError } from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";
import { paginateArray, type PaginatedResult } from "../../common/pagination/index.js";
import { eventBus } from "../../events/domain-events.js";

export class RoomChangeService {
  public static async listRoomChanges(
    institutionId: string,
    query: {
      status?: string | undefined;
      studentId?: string | undefined;
      limit?: number | undefined;
      cursor?: string | undefined;
    },
  ): Promise<PaginatedResult<IRoomChangeRequest>> {
    const filter: Record<string, unknown> = { institution_id: new Types.ObjectId(institutionId) };
    if (query.status) filter.status = query.status.toLowerCase();
    if (query.studentId) filter.student_id = new Types.ObjectId(query.studentId);

    const items = await RoomChangeRequestModel.find(filter)
      .sort({ createdAt: -1 })
      .lean<IRoomChangeRequest[]>();
    return paginateArray<IRoomChangeRequest>(items, query.limit ?? 50, query.cursor);
  }

  public static async createRoomChangeRequest(
    institutionId: string,
    studentId: string,
    data: {
      currentBedId: string;
      reason: string;
      preferredHostelId?: string;
      preferredRoomType?: string;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<RoomChangeRequestDocument> {
    const instId = new Types.ObjectId(institutionId);
    const studentObjectId = new Types.ObjectId(studentId);
    const bedObjectId = new Types.ObjectId(data.currentBedId);

    const existing = await RoomChangeRequestModel.findOne({
      institution_id: instId,
      student_id: studentObjectId,
      status: "pending",
    });
    if (existing) {
      throw new ConflictError(
        "You already have a pending room change request",
        "PENDING_REQUEST_EXISTS",
      );
    }

    const currentBed = await BedModel.findById(bedObjectId);
    if (!currentBed) throw new NotFoundError("Current bed not found", "BED_NOT_FOUND");

    const currentRoom = await RoomModel.findById(currentBed.room_id);

    const assignment = await AllocationAssignmentModel.findOne({
      student_id: studentObjectId,
      bed_id: bedObjectId,
    });

    const request = await RoomChangeRequestModel.create({
      institution_id: instId,
      student_id: studentObjectId,
      assignment_id: assignment?._id ?? new Types.ObjectId(),
      draft_id: assignment?.draft_id ?? new Types.ObjectId(),
      from_bed_id: currentBed._id,
      from_room_id: currentBed.room_id,
      from_hostel_id: currentRoom?.hostel_id ?? new Types.ObjectId(),
      reason: data.reason,
      evidence_keys: [],
      status: "pending",
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "room_change.request",
      target: { resourceType: "RoomChangeRequest", resourceId: request._id.toString() },
      after: { reason: data.reason },
    });

    return request;
  }

  public static async decideRoomChange(
    institutionId: string,
    requestId: string,
    decision: {
      status: "APPROVED" | "REJECTED";
      newBedId?: string;
      notes: string;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<RoomChangeRequestDocument> {
    const instId = new Types.ObjectId(institutionId);
    const request = await RoomChangeRequestModel.findOne({
      _id: new Types.ObjectId(requestId),
      institution_id: instId,
    });
    if (!request) throw new NotFoundError("Room change request not found", "REQUEST_NOT_FOUND");

    if (decision.status === "APPROVED") {
      if (!decision.newBedId) {
        throw new BadRequestError(
          "Target bed ID is required when approving room change",
          "NEW_BED_REQUIRED",
        );
      }

      const newBed = await BedModel.findOne({
        _id: new Types.ObjectId(decision.newBedId),
        institution_id: instId,
      });
      if (!newBed || newBed.status !== "available") {
        throw new ConflictError("Target bed is not available", "BED_NOT_AVAILABLE");
      }

      const targetRoom = await RoomModel.findById(newBed.room_id);

      await BedModel.findByIdAndUpdate(request.from_bed_id, { status: "available" });
      newBed.status = "occupied";
      await newBed.save();

      await AllocationAssignmentModel.findOneAndUpdate(
        { student_id: request.student_id },
        {
          bed_id: newBed._id,
          room_id: newBed.room_id,
          hostel_id: targetRoom?.hostel_id ?? newBed.room_id,
        },
      );

      request.to_bed_id = newBed._id;
      request.status = "approved";
    } else {
      request.status = "rejected";
    }

    request.decision_reason = decision.notes;
    request.decided_by = {
      user_id: actor.userId,
      email: actor.email,
      role: actor.role,
    };
    request.decided_at = new Date();
    await request.save();

    eventBus.publish({
      type: "room.changed",
      institutionId,
      timestamp: new Date(),
      payload: {
        requestId: request._id.toString(),
        studentId: request.student_id.toString(),
        status: request.status,
      },
      actor,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "room_change.decide",
      target: { resourceType: "RoomChangeRequest", resourceId: request._id.toString() },
      after: { status: request.status, notes: decision.notes },
    });

    return request;
  }
}
