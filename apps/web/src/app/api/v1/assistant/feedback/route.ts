import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";

const feedbackSchema = z.object({
  helpful: z.boolean(),
  comment: z.string().max(500).optional(),
  optInToMessageLogging: z.boolean().default(false),
});

export const POST = apiHandler(
  {
    public: true,
    body: feedbackSchema,
    operationId: "assistantFeedback",
    summary: "Record user satisfaction feedback for the AI policy assistant",
    rateLimit: {
      limit: 20,
      windowSeconds: 60,
    },
  },
  async ({ user, body, requestId }) => {
    // If user explicitly opted in, log their feedback comment
    const feedbackPayload: Record<string, unknown> = {
      event: "assistant_feedback",
      requestId,
      userId: user?.id ?? "anonymous",
      helpful: body.helpful,
      optInToMessageLogging: body.optInToMessageLogging,
      timestamp: new Date().toISOString(),
    };

    if (body.optInToMessageLogging && body.comment) {
      feedbackPayload["comment"] = body.comment;
    }

    console.info(JSON.stringify(feedbackPayload));

    return {
      success: true,
      message: "Thank you for your feedback!",
    };
  },
);
