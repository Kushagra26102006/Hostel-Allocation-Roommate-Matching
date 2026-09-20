/* eslint-disable no-restricted-imports */
import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiProblemError } from "@/lib/api/errors.js";
import {
  connectDb,
  AllocationDraftModel,
  AllocationAssignmentModel,
  RoomModel,
  BedModel,
  UserModel,
  ApplicationModel,
} from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export const GET = apiHandler(
  {
    permission: "hostel:review_own",
    params: paramsSchema,
    operationId: "getDraftBedMap",
    summary: "Get spatial bed map grouped by floors and rooms with live occupant statuses",
  },
  async ({ params, institution_id }) => {
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

    // Fetch assignments for this draft
    const assignments = await AllocationAssignmentModel.find({ draft_id: draft._id }).lean().exec();
    const bedToAssignment = new Map(assignments.map((a) => [a.bed_id.toString(), a]));

    const studentIds = assignments.map((a) => a.student_id);
    const applicationIds = assignments.map((a) => a.application_id);

    const [students, applications] = await Promise.all([
      UserModel.find({ _id: { $in: studentIds } })
        .select("name email")
        .lean()
        .exec(),
      ApplicationModel.find({ _id: { $in: applicationIds } })
        .select("reference_number form_data quota_category")
        .lean()
        .exec(),
    ]);

    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
    const appMap = new Map(applications.map((a) => [a._id.toString(), a]));

    // Fetch rooms and beds
    const rooms = await RoomModel.find({ institution_id: instId })
      .sort({ room_number: 1 })
      .lean()
      .exec();
    const roomIds = rooms.map((r) => r._id);
    const beds = await BedModel.find({ room_id: { $in: roomIds } })
      .sort({ bed_no: 1 })
      .lean()
      .exec();

    const bedsByRoom = new Map<string, typeof beds>();
    for (const bed of beds) {
      const rid = bed.room_id.toString();
      const list = bedsByRoom.get(rid) ?? [];
      list.push(bed);
      bedsByRoom.set(rid, list);
    }

    // Group rooms by floor (extracted from first digit of room number, e.g. "101" -> 1, "204" -> 2)
    const floorsMap = new Map<number, Array<Record<string, unknown>>>();

    for (const room of rooms) {
      const floorNum = parseInt(room.room_number[0] || "1", 10) || 1;
      const roomBeds = bedsByRoom.get(room._id.toString()) ?? [];

      const mappedBeds = roomBeds.map((b) => {
        const assignment = bedToAssignment.get(b._id.toString());
        const student = assignment ? studentMap.get(assignment.student_id.toString()) : null;
        const app = assignment ? appMap.get(assignment.application_id.toString()) : null;

        const isAccessible = Boolean(b.attributes?.accessible || room.accessible);
        let status: "assigned" | "free" | "waitlist_candidate" | "accessible" | "conflict" =
          assignment ? "assigned" : "free";

        if (!assignment && isAccessible) {
          status = "accessible";
        } else if (!assignment) {
          status = "free";
        }

        const appFormData = (app?.form_data ?? {}) as Record<string, unknown>;
        const quotaCategory = (appFormData.quota_category as string) || "General";

        return {
          id: b._id.toString(),
          bedNo: b.bed_no,
          accessible: isAccessible,
          status,
          assignment: assignment
            ? {
                id: assignment._id.toString(),
                studentId: assignment.student_id.toString(),
                studentName: student?.name || "Student Resident",
                email: student?.email || "student@test.edu",
                rollNumber: app?.reference_number || "REG-001",
                quota: quotaCategory,
                score: assignment.score,
                explanation: assignment.explanation,
              }
            : null,
        };
      });

      const roomData = {
        id: room._id.toString(),
        roomNumber: room.room_number,
        roomType: room.room_type,
        capacity: room.capacity,
        accessible: Boolean(room.accessible),
        occupiedCount: mappedBeds.filter((b) => b.assignment).length,
        beds: mappedBeds,
      };

      const floorRooms = floorsMap.get(floorNum) ?? [];
      floorRooms.push(roomData);
      floorsMap.set(floorNum, floorRooms);
    }

    const floors = Array.from(floorsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([floorNumber, roomList]) => ({
        floorNumber,
        floorLabel: `Floor ${floorNumber}`,
        totalRooms: roomList.length,
        totalBeds: roomList.reduce((acc, r) => acc + (r.beds as unknown[]).length, 0),
        occupiedBeds: roomList.reduce((acc, r) => acc + (r.occupiedCount as number), 0),
        rooms: roomList,
      }));

    return { floors };
  },
);
