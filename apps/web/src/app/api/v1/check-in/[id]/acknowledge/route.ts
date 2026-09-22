import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, CheckInService } from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const acknowledgeSchema = z.object({
  student_notes: z.string().optional(),
  signature_hash: z.string().optional(),
});

export const POST = apiHandler(
  {
    permission: "checkin:acknowledge",
    params: paramsSchema,
    body: acknowledgeSchema,
    operationId: "acknowledgeCheckInChecklist",
    summary: "Student acknowledges room-condition checklist on their phone",
  },
  async ({ user, institution_id, params, body }) => {
    await connectDb();

    const service = new CheckInService(institution_id);
    const updated = await service.recordStudentAcknowledgement(params.id, user!.id, {
      studentNotes: body.student_notes,
      signatureHash: body.signature_hash,
    });

    return {
      success: true,
      record: updated,
    };
  },
);
