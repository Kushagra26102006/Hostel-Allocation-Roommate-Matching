import crypto from "node:crypto";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { WebhookRepository, WEBHOOK_EVENTS, type WebhookEventType } from "@hostelhub/db";

const createWebhookSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  url: z.string().url("Must be a valid URL starting with http:// or https://"),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "Select at least one event"),
  secret: z.string().optional(),
});

export const dynamic = "force-dynamic";

export const GET = apiHandler(
  {
    permission: "webhooks:manage",
    operationId: "listWebhooks",
    summary: "List all configured webhooks for tenant",
  },
  async ({ institution_id }) => {
    const repo = new WebhookRepository(institution_id);
    const webhooks = await repo.listAll();

    return {
      webhooks: webhooks.map((w) => ({
        id: w._id.toString(),
        name: w.name,
        url: w.url,
        events: w.events,
        secret: w.secret,
        status: w.status,
        failure_count: w.failure_count,
        auto_disabled_at: w.auto_disabled_at,
        createdAt: w.createdAt,
      })),
    };
  },
);

export const POST = apiHandler(
  {
    permission: "webhooks:manage",
    body: createWebhookSchema,
    operationId: "createWebhook",
    summary: "Register a new webhook subscription",
  },
  async ({ institution_id, body }) => {
    const repo = new WebhookRepository(institution_id);
    const secret = body.secret?.trim() || `whsec_${crypto.randomBytes(20).toString("hex")}`;

    const doc = await repo.create({
      name: body.name.trim(),
      url: body.url.trim(),
      events: body.events as WebhookEventType[],
      secret,
      status: "active",
      failure_count: 0,
    });

    return {
      success: true,
      webhook: {
        id: doc._id.toString(),
        name: doc.name,
        url: doc.url,
        events: doc.events,
        secret: doc.secret,
        status: doc.status,
        failure_count: doc.failure_count,
        createdAt: doc.createdAt,
      },
    };
  },
);
