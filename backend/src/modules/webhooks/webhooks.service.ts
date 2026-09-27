import crypto from "crypto";
import { Types } from "mongoose";
import {
  WebhookModel,
  WebhookDeliveryLogModel,
  type IWebhook,
  type WebhookDocument,
  type WebhookEventType,
} from "@hostelhub/db";
import { NotFoundError } from "../../common/errors/app-error.js";
import { signHmacPayload } from "../../common/security/signatures.js";
import { eventBus, type DomainEvent } from "../../events/domain-events.js";
import { logger } from "../../config/logger.js";
import { AuditService } from "../audit/audit.service.js";

export class WebhooksService {
  public static async registerWebhook(
    institutionId: string,
    data: { url: string; events: string[]; secret?: string; name?: string },
    actor: { userId: string; email: string; role: string },
  ): Promise<WebhookDocument> {
    const secret = data.secret || crypto.randomBytes(24).toString("hex");
    const instId = new Types.ObjectId(institutionId);

    const webhook = await WebhookModel.create({
      institution_id: instId,
      name: data.name || "Webhook Integration",
      url: data.url,
      events: data.events as WebhookEventType[],
      secret,
      status: "active",
      failure_count: 0,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "webhooks.register",
      target: { resourceType: "Webhook", resourceId: webhook._id.toString() },
      after: { url: webhook.url, events: webhook.events },
    });

    return webhook;
  }

  public static async listWebhooks(institutionId: string): Promise<IWebhook[]> {
    return WebhookModel.find({ institution_id: new Types.ObjectId(institutionId) }).lean<
      IWebhook[]
    >();
  }

  public static async deleteWebhook(
    institutionId: string,
    webhookId: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<{ success: boolean }> {
    const webhook = await WebhookModel.findOneAndDelete({
      _id: new Types.ObjectId(webhookId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!webhook) throw new NotFoundError("Webhook not found", "WEBHOOK_NOT_FOUND");

    await AuditService.record({
      institutionId,
      actor,
      action: "webhooks.delete",
      target: { resourceType: "Webhook", resourceId: webhookId },
    });

    return { success: true };
  }

  public static async dispatchEvent(event: DomainEvent): Promise<void> {
    const webhooks = await WebhookModel.find({
      institution_id: new Types.ObjectId(event.institutionId),
      events: event.type,
      status: "active",
    });

    for (const hook of webhooks) {
      const payloadString = JSON.stringify(event);
      const signature = signHmacPayload(payloadString, hook.secret);

      try {
        const response = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Signature": signature,
            "X-Event-Type": event.type,
          },
          body: payloadString,
          signal: AbortSignal.timeout(5000),
        });

        await WebhookDeliveryLogModel.create({
          institution_id: hook.institution_id,
          webhook_id: hook._id,
          event_type: event.type,
          payload: event.payload as Record<string, unknown>,
          http_status: response.status,
          success: response.ok,
          delivered_at: new Date(),
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn({ err: errMsg, hookUrl: hook.url }, "Failed to deliver webhook");
        await WebhookDeliveryLogModel.create({
          institution_id: hook.institution_id,
          webhook_id: hook._id,
          event_type: event.type,
          payload: event.payload as Record<string, unknown>,
          http_status: 0,
          error_message: errMsg,
          success: false,
          delivered_at: new Date(),
        });
      }
    }
  }
}

// Hook eventBus to Webhooks
eventBus.subscribe("*", async (event) => {
  await WebhooksService.dispatchEvent(event);
});
