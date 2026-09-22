import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, CheckInRecordModel } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export const GET = apiHandler(
  {
    params: paramsSchema,
    operationId: "getCheckInRecord",
    summary: "Get check-in record details with inspection checklist and check-out status",
  },
  async ({ user, institution_id, params }) => {
    await connectDb();

    const record = await CheckInRecordModel.findOne({
      _id: params.id,
      institution_id,
    })
      .populate("student_id", "name email roll_number")
      .populate("hostel_id", "name")
      .populate("room_id", "room_number")
      .populate("bed_id", "bed_no")
      .lean();

    if (!record) {
      throw new ApiProblemError({
        title: "Record Not Found",
        status: 404,
        detail: "Check-in record not found",
        code: "NOT_FOUND",
      });
    }

    // Role verification: Student can only view their own record unless staff
    const userRoles = user?.roles ?? [];
    const isStaff = userRoles.some((r) =>
      ["warden", "chief_warden", "hostel_admin", "dean", "sys_admin"].includes(r),
    );

    const studentDocId = (
      record as unknown as { student_id?: { _id?: { toString: () => string } } }
    ).student_id?._id?.toString();

    if (!isStaff && studentDocId !== user?.id) {
      throw new ApiProblemError({
        title: "Forbidden",
        status: 403,
        detail: "You are not authorized to view this check-in record",
        code: "FORBIDDEN",
      });
    }

    return {
      record,
    };
  },
);
