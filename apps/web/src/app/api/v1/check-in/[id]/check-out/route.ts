import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, CheckInService } from "@hostelhub/db";
import type { WorkflowRole } from "@hostelhub/domain";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const checklistItemInputSchema = z.object({
  itemId: z.string().min(1),
  label: z.string().min(1),
  category: z.enum(["furniture", "electrical", "plumbing", "fixtures", "general"]),
  condition: z.enum(["good", "fair", "damaged", "missing"]),
  notes: z.string().optional(),
  photoS3Key: z.string().optional(),
  photoUrl: z.string().optional(),
});

const checkOutSchema = z.object({
  checklist: z.array(checklistItemInputSchema),
  notes: z.string().optional(),
});

export const POST = apiHandler(
  {
    permission: "checkin:manage",
    params: paramsSchema,
    body: checkOutSchema,
    operationId: "recordCheckOut",
    summary: "Record check-out inspection, calculate differences, and flag damage liability",
  },
  async ({ user, institution_id, params, body }) => {
    await connectDb();

    const service = new CheckInService(institution_id);
    const actor = {
      id: user!.id,
      email: user!.email,
      role: (user!.roles[0] || "warden") as WorkflowRole,
      name: user!.name,
    };

    const { record, diffReport } = await service.recordCheckOut(
      params.id,
      {
        checklist: body.checklist,
        notes: body.notes,
      },
      actor,
    );

    return {
      success: true,
      record,
      diffReport,
    };
  },
);
