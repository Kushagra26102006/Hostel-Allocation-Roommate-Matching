import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, CheckInService, CheckInRecordModel } from "@hostelhub/db";
import type { WorkflowRole } from "@hostelhub/domain";

const checklistItemInputSchema = z.object({
  itemId: z.string().min(1),
  label: z.string().min(1),
  category: z.enum(["furniture", "electrical", "plumbing", "fixtures", "general"]),
  condition: z.enum(["good", "fair", "damaged", "missing"]),
  notes: z.string().optional(),
  photoS3Key: z.string().optional(),
  photoUrl: z.string().optional(),
});

const checkInInputSchema = z.object({
  token_or_code: z.string().min(1),
  checklist: z.array(checklistItemInputSchema),
  notes: z.string().optional(),
  client_sync_id: z.string().optional(),
  client_scanned_at: z.string().optional(),
});

const listCheckInsQuerySchema = z.object({
  hostel_id: z.string().optional(),
  status: z.enum(["checked_in", "checked_out", "no_show"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const POST = apiHandler(
  {
    permission: "checkin:manage",
    body: checkInInputSchema,
    operationId: "recordCheckIn",
    summary: "Record digital check-in with warden and room inspection checklist",
  },
  async ({ user, institution_id, body }) => {
    await connectDb();

    const service = new CheckInService(institution_id);
    const actor = {
      id: user!.id,
      email: user!.email,
      role: (user!.roles[0] || "warden") as WorkflowRole,
      name: user!.name,
    };

    const record = await service.recordCheckIn(
      {
        tokenOrCode: body.token_or_code,
        checklist: body.checklist,
        notes: body.notes,
        clientSyncId: body.client_sync_id,
        clientScannedAt: body.client_scanned_at ? new Date(body.client_scanned_at) : undefined,
      },
      actor,
    );

    return {
      success: true,
      record,
    };
  },
);

export const GET = apiHandler(
  {
    permission: "checkin:manage",
    query: listCheckInsQuerySchema,
    operationId: "listCheckInRecords",
    summary: "List check-in and check-out records with filters",
  },
  async ({ institution_id, query }) => {
    await connectDb();

    const filter: Record<string, unknown> = {
      institution_id,
    };

    if (query.hostel_id) {
      filter["hostel_id"] = query.hostel_id;
    }

    if (query.status) {
      filter["status"] = query.status;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      CheckInRecordModel.find(filter)
        .sort({ "check_in.time": -1 })
        .skip(skip)
        .limit(limit)
        .populate("student_id", "name email roll_number")
        .populate("hostel_id", "name")
        .populate("room_id", "room_number")
        .populate("bed_id", "bed_no")
        .lean(),
      CheckInRecordModel.countDocuments(filter),
    ]);

    return {
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
);
