import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, CheckInService } from "@hostelhub/db";
import type { WorkflowRole } from "@hostelhub/domain";

const noShowSchema = z.object({
  letter_or_assignment_id: z.string().min(1, "Letter code or assignment ID is required"),
  reason: z.string().min(5, "A specific reason is required (min 5 characters)"),
});

export const POST = apiHandler(
  {
    permission: "checkin:manage",
    body: noShowSchema,
    operationId: "markNoShow",
    summary:
      "Mark student as no-show when past deadline, vacating bed and triggering waitlist promotion",
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

    const result = await service.markNoShow(body.letter_or_assignment_id, body.reason, actor);

    return {
      success: true,
      ...result,
    };
  },
);
