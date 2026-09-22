import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { WebhookRepository } from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1, "Webhook ID is required"),
});

export const dynamic = "force-dynamic";

export const DELETE = apiHandler(
  {
    permission: "webhooks:manage",
    params: paramsSchema,
    operationId: "deleteWebhook",
    summary: "Delete a webhook subscription",
  },
  async ({ institution_id, params }) => {
    const repo = new WebhookRepository(institution_id);
    const existing = await repo.findById(params.id);

    if (!existing) {
      return {
        success: false,
        error: "Webhook not found",
      };
    }

    // Set to disabled or delete
    await repo.setStatus(params.id, "disabled");

    return {
      success: true,
      deletedWebhookId: params.id,
    };
  },
);
