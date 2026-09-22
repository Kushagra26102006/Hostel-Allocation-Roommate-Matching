import type { ClientSession, Types } from "mongoose";
import {
  WebhookDeliveryLogModel,
  type WebhookDeliveryLogDocument,
} from "../models/webhook-delivery-log.model.js";
import { BaseRepository } from "./base.repository.js";

export class WebhookDeliveryLogRepository extends BaseRepository<WebhookDeliveryLogDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(WebhookDeliveryLogModel, institutionId);
  }

  public async findByWebhook(
    webhookId: string | Types.ObjectId,
    limit = 20,
    session?: ClientSession,
  ): Promise<WebhookDeliveryLogDocument[]> {
    return this.find(
      {
        webhook_id: typeof webhookId === "string" ? webhookId : webhookId.toString(),
      } as unknown as Record<string, unknown>,
      undefined,
      {
        sort: { delivered_at: -1 },
        limit,
        ...(session ? { session } : {}),
      },
    );
  }

  public async findRecent(
    limit = 50,
    session?: ClientSession,
  ): Promise<WebhookDeliveryLogDocument[]> {
    return this.find({}, undefined, {
      sort: { delivered_at: -1 },
      limit,
      ...(session ? { session } : {}),
    });
  }
}
