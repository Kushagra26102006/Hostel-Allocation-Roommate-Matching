import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export interface IWebhookDeliveryLog {
  webhook_id: Types.ObjectId;
  event: string;
  url: string;
  payload: unknown;
  signature: string;
  timestamp: string;
  status_code: number;
  response_body?: string | undefined;
  duration_ms: number;
  attempt: number;
  success: boolean;
  error_message?: string | undefined;
  delivered_at: Date;
}

export interface WebhookDeliveryLogDocument extends BaseTenantDocument, IWebhookDeliveryLog {}

const webhookDeliveryLogSchema = new Schema<WebhookDeliveryLogDocument>(
  {
    webhook_id: {
      type: Schema.Types.ObjectId,
      ref: "Webhook",
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
    timestamp: {
      type: String,
      required: true,
    },
    status_code: {
      type: Number,
      required: true,
    },
    response_body: {
      type: String,
      maxlength: 2000,
    },
    duration_ms: {
      type: Number,
      required: true,
    },
    attempt: {
      type: Number,
      required: true,
      default: 1,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    error_message: {
      type: String,
      maxlength: 1000,
    },
    delivered_at: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

webhookDeliveryLogSchema.plugin(baseSchemaPlugin);

webhookDeliveryLogSchema.index({ institution_id: 1, webhook_id: 1, delivered_at: -1 });
webhookDeliveryLogSchema.index({ institution_id: 1, delivered_at: -1 });

export const WebhookDeliveryLogModel =
  (mongoose.models["WebhookDeliveryLog"] as Model<WebhookDeliveryLogDocument>) ||
  model<WebhookDeliveryLogDocument>("WebhookDeliveryLog", webhookDeliveryLogSchema);
