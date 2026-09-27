import { Types } from "mongoose";
import {
  WaitlistEntryModel,
  BedModel,
  AllocationAssignmentModel,
  ApplicationModel,
  RoomModel,
  type IWaitlistEntry,
  type WaitlistEntryDocument,
  type AllocationAssignmentDocument,
} from "@hostelhub/db";
import { NotFoundError, BadRequestError, ConflictError } from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";
import { paginateArray, type PaginatedResult } from "../../common/pagination/index.js";
import { eventBus } from "../../events/domain-events.js";

export interface PromoteWaitlistResult {
  success: boolean;
  assignment: AllocationAssignmentDocument;
  entry: WaitlistEntryDocument;
}

export class WaitlistService {
  public static async listWaitlist(
    institutionId: string,
    query: {
      cycleId?: string | undefined;
      quota?: string | undefined;
      status?: string | undefined;
      limit?: number | undefined;
      cursor?: string | undefined;
    },
  ): Promise<PaginatedResult<IWaitlistEntry>> {
    const filter: Record<string, unknown> = { institution_id: new Types.ObjectId(institutionId) };
    if (query.quota) filter.quota_bucket = query.quota;
    if (query.status) filter.status = query.status.toLowerCase();

    const entries = await WaitlistEntryModel.find(filter)
      .sort({ position: 1 })
      .lean<IWaitlistEntry[]>();
    return paginateArray<IWaitlistEntry>(entries, query.limit ?? 50, query.cursor);
  }

  public static async promoteWaitlistEntry(
    institutionId: string,
    waitlistEntryId: string,
    targetBedId: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<PromoteWaitlistResult> {
    const instId = new Types.ObjectId(institutionId);
    const entry = await WaitlistEntryModel.findOne({
      _id: new Types.ObjectId(waitlistEntryId),
      institution_id: instId,
    });
    if (!entry) throw new NotFoundError("Waitlist entry not found", "WAITLIST_ENTRY_NOT_FOUND");

    if (entry.status !== "waiting") {
      throw new BadRequestError(
        `Cannot promote waitlist entry with status '${entry.status}'`,
        "INVALID_STATUS",
      );
    }

    const [bed, application] = await Promise.all([
      BedModel.findOne({ _id: new Types.ObjectId(targetBedId), institution_id: instId }),
      ApplicationModel.findOne({ _id: entry.application_id, institution_id: instId }),
    ]);

    if (!bed) throw new NotFoundError("Target bed not found", "BED_NOT_FOUND");
    if (!application) throw new NotFoundError("Application not found", "APPLICATION_NOT_FOUND");

    if (bed.status !== "available") {
      throw new ConflictError(
        `Bed '${bed.bed_no}' is not currently available (status: ${bed.status})`,
        "BED_NOT_AVAILABLE",
      );
    }

    const room = await RoomModel.findById(bed.room_id);
    if (!room) throw new NotFoundError("Room not found", "ROOM_NOT_FOUND");

    bed.status = "occupied";
    await bed.save();

    const assignment = await AllocationAssignmentModel.create({
      institution_id: instId,
      draft_id: entry.draft_id,
      run_id: entry.run_id,
      application_id: entry.application_id,
      student_id: entry.student_id,
      bed_id: bed._id,
      room_id: bed.room_id,
      hostel_id: room.hostel_id,
      score: 100,
      explanation:
        "Promoted from waitlist as bed became available and hard constraints were verified.",
    });

    entry.status = "promoted";
    await entry.save();

    eventBus.publish({
      type: "waitlist.promoted",
      institutionId,
      timestamp: new Date(),
      payload: {
        waitlistEntryId: entry._id.toString(),
        studentId: entry.student_id.toString(),
        bedId: bed._id.toString(),
      },
      actor,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "waitlist.promote",
      target: { resourceType: "WaitlistEntry", resourceId: entry._id.toString() },
      after: { bedId: bed._id.toString(), assignmentId: assignment._id.toString() },
    });

    return { success: true, assignment, entry };
  }
}
