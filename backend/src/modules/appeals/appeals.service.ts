import { Types } from "mongoose";
import {
  AppealModel,
  AllocationAssignmentModel,
  BedModel,
  RoomModel,
  type IAppeal,
} from "@hostelhub/db";
import { NotFoundError, ConflictError } from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";
import { paginateArray, type PaginatedResult } from "../../common/pagination/index.js";
import { eventBus } from "../../events/domain-events.js";

export class AppealsService {
  public static async listAppeals(
    institutionId: string,
    query: {
      status?: string | undefined;
      studentId?: string | undefined;
      limit?: number | undefined;
      cursor?: string | undefined;
    },
  ): Promise<PaginatedResult<IAppeal>> {
    const filter: Record<string, unknown> = { institution_id: new Types.ObjectId(institutionId) };
    if (query.status) filter.status = query.status.toLowerCase();
    if (query.studentId) filter.student_id = new Types.ObjectId(query.studentId);

    const appeals = await AppealModel.find(filter).sort({ createdAt: -1 }).lean<IAppeal[]>();
    return paginateArray(appeals, query.limit ?? 50, query.cursor);
  }

  public static async createAppeal(
    institutionId: string,
    studentId: string,
    data: {
      cycleId: string;
      reason: string;
      category?: string;
      evidenceUrl?: string;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<IAppeal> {
    const instId = new Types.ObjectId(institutionId);
    const studentObjectId = new Types.ObjectId(studentId);

    const existing = await AppealModel.findOne({
      institution_id: instId,
      student_id: studentObjectId,
      status: { $in: ["submitted", "warden_review", "chief_warden_review"] },
    });
    if (existing) {
      throw new ConflictError(
        "You already have an active appeal for this allocation cycle",
        "DUPLICATE_APPEAL",
      );
    }

    const assignment = await AllocationAssignmentModel.findOne({
      student_id: studentObjectId,
    });

    const appeal = await AppealModel.create({
      institution_id: instId,
      student_id: studentObjectId,
      assignment_id: assignment?._id ?? new Types.ObjectId(),
      draft_id: assignment?.draft_id ?? new Types.ObjectId(),
      statement: data.reason,
      evidence_keys: data.evidenceUrl ? [data.evidenceUrl] : [],
      status: "submitted",
      sla_due_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
      sla_config_days: 2,
      current_reviewer_role: "warden",
    });

    eventBus.publish({
      type: "appeal.submitted",
      institutionId,
      timestamp: new Date(),
      payload: { appealId: appeal._id.toString(), studentId },
      actor,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "appeals.create",
      target: { resourceType: "Appeal", resourceId: appeal._id.toString() },
      after: { reason: data.reason },
    });

    return appeal;
  }

  public static async decideAppeal(
    institutionId: string,
    appealId: string,
    decision: {
      status: "UPHELD" | "DISMISSED";
      notes: string;
      newBedId?: string;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<IAppeal> {
    const instId = new Types.ObjectId(institutionId);
    const appeal = await AppealModel.findOne({
      _id: new Types.ObjectId(appealId),
      institution_id: instId,
    });
    if (!appeal) throw new NotFoundError("Appeal not found", "APPEAL_NOT_FOUND");

    const outcome = decision.status === "UPHELD" ? "upheld" : "rejected";

    if (decision.status === "UPHELD" && decision.newBedId) {
      const newBed = await BedModel.findOne({
        _id: new Types.ObjectId(decision.newBedId),
        institution_id: instId,
      });
      if (newBed && newBed.status === "available") {
        const room = await RoomModel.findById(newBed.room_id);
        newBed.status = "occupied";
        await newBed.save();

        await AllocationAssignmentModel.findOneAndUpdate(
          { student_id: appeal.student_id },
          {
            bed_id: newBed._id,
            room_id: newBed.room_id,
            hostel_id: room?.hostel_id ?? newBed.room_id,
          },
        );
      }
    }

    appeal.status = outcome;
    appeal.final_outcome = outcome;
    appeal.warden_decision = {
      outcome,
      reason: decision.notes,
      decided_by: {
        user_id: actor.userId,
        email: actor.email,
        role: actor.role,
      },
      decided_at: new Date(),
    };
    await appeal.save();

    eventBus.publish({
      type: "appeal.decided",
      institutionId,
      timestamp: new Date(),
      payload: {
        appealId: appeal._id.toString(),
        studentId: appeal.student_id.toString(),
        status: outcome,
      },
      actor,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "appeals.decide",
      target: { resourceType: "Appeal", resourceId: appeal._id.toString() },
      after: { status: outcome, notes: decision.notes },
    });

    return appeal;
  }
}
