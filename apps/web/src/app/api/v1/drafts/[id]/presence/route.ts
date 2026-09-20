import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiProblemError } from "@/lib/api/errors.js";
import { updateReviewerPresence, type ReviewerPresence } from "@/lib/queue/draft-events.js";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const bodySchema = z.object({
  floor: z.number().int().min(0).max(50).default(1),
});

export const POST = apiHandler(
  {
    permission: "hostel:review_own",
    params: paramsSchema,
    body: bodySchema,
    operationId: "reportDraftPresence",
    summary: "Report reviewer floor presence heartbeat for draft live collaboration",
  },
  async ({ params, body, user }) => {
    if (!user) {
      throw new ApiProblemError({
        status: 401,
        title: "Unauthorized",
        detail: "User authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const presence: ReviewerPresence = {
      userId: user.id,
      name: user.name || user.email.split("@")[0] || "Reviewer",
      email: user.email,
      floor: body.floor ?? 1,
      updatedAt: Date.now(),
    };

    const activeReviewers = await updateReviewerPresence(params.id, presence);

    return {
      success: true,
      reviewers: activeReviewers,
    };
  },
);
