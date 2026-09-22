import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { WebhookDeliveryLogRepository } from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1, "Webhook ID is required"),
});

export const dynamic = "force-dynamic";

export const GET = apiHandler(
  {
    permission: "webhooks:manage",
    params: paramsSchema,
    operationId: "getWebhookLogs",
    summary: "Fetch delivery history for a webhook",
  },
  async ({ institution_id, params }) => {
    const repo = new WebhookDeliveryLogRepository(institution_id);
    const logs = await repo.findByWebhook(params.id, 50);

    return {
      logs: logs.map((l) => ({
        id: l._id.toString(),
        event: l.event,
        url: l.url,
        status_code: l.status_code,
        response_body: l.response_body,
        duration_ms: l.duration_ms,
        attempt: l.attempt,
        success: l.success,
        error_message: l.error_message,
        delivered_at: l.delivered_at,
      })),
    };
  },
);
