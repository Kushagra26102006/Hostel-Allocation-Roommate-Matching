import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { WebhookDispatcherService } from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1, "Webhook ID is required"),
});

export const dynamic = "force-dynamic";

export const POST = apiHandler(
  {
    permission: "webhooks:manage",
    params: paramsSchema,
    operationId: "testWebhook",
    summary: "Send a test ping event to webhook endpoint",
  },
  async ({ institution_id, params }) => {
    const dispatcher = new WebhookDispatcherService(institution_id);
    const result = await dispatcher.sendTestPing(params.id);

    return {
      success: result.success,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      attempts: result.attempts,
      autoDisabled: result.autoDisabled,
      logId: result.logId,
      error: result.error,
    };
  },
);
