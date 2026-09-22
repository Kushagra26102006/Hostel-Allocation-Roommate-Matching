import type { ClientSession, Types } from "mongoose";
import {
  WebhookModel,
  type WebhookDocument,
  type WebhookEventType,
} from "../models/webhook.model.js";
import { BaseRepository } from "./base.repository.js";

export class WebhookRepository extends BaseRepository<WebhookDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(WebhookModel, institutionId);
  }

  public async findActiveByEvent(
    event: WebhookEventType,
    session?: ClientSession,
  ): Promise<WebhookDocument[]> {
    return this.find(
      {
        status: "active",
        events: event,
      },
      undefined,
      session ? { session } : undefined,
    );
  }

  public async listAll(session?: ClientSession): Promise<WebhookDocument[]> {
    return this.find({}, undefined, session ? { session } : undefined);
  }

  public async recordSuccess(
    id: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<WebhookDocument | null> {
    return this.update(
      id,
      {
        $set: { failure_count: 0 },
      },
      session,
    );
  }

  public async recordFailure(
    id: string | Types.ObjectId,
    maxConsecutiveFailures = 5,
    session?: ClientSession,
  ): Promise<{ webhook: WebhookDocument | null; autoDisabled: boolean }> {
    const current = await this.findById(id, undefined, session ? { session } : undefined);
    if (!current) {
      return { webhook: null, autoDisabled: false };
    }

    const newFailureCount = (current.failure_count || 0) + 1;
    const shouldDisable = newFailureCount >= maxConsecutiveFailures;

    const updateData: Record<string, unknown> = {
      failure_count: newFailureCount,
    };

    if (shouldDisable) {
      updateData.status = "disabled";
      updateData.auto_disabled_at = new Date();
    }

    const updated = await this.update(
      id,
      {
        $set: updateData,
      },
      session,
    );

    return {
      webhook: updated,
      autoDisabled: shouldDisable,
    };
  }

  public async setStatus(
    id: string | Types.ObjectId,
    status: "active" | "disabled",
    session?: ClientSession,
  ): Promise<WebhookDocument | null> {
    return this.update(
      id,
      {
        $set: {
          status,
          ...(status === "active" ? { failure_count: 0, auto_disabled_at: undefined } : {}),
        },
      },
      session,
    );
  }
}
