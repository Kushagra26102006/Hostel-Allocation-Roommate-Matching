import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export const WEBHOOK_EVENTS = [
  "application.submitted",
  "run.completed",
  "draft.approved",
  "allocation.published",
  "waitlist.promoted",
  "room.changed",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export type WebhookStatus = "active" | "disabled";

export interface IWebhook {
  name: string;
  url: string;
  events: WebhookEventType[];
  secret: string; // HMAC secret token
  status: WebhookStatus;
  failure_count: number;
  auto_disabled_at?: Date | undefined;
  created_by?: Types.ObjectId | undefined;
}

export interface WebhookDocument extends BaseTenantDocument, IWebhook {}

const webhookSchema = new Schema<WebhookDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    events: {
      type: [String],
      required: true,
      enum: WEBHOOK_EVENTS,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "At least one event must be selected",
      },
    },
    secret: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      index: true,
    },
    failure_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    auto_disabled_at: {
      type: Date,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

webhookSchema.plugin(baseSchemaPlugin);

webhookSchema.index({ institution_id: 1, status: 1 });
webhookSchema.index({ institution_id: 1, events: 1 });

export const WebhookModel =
  (mongoose.models["Webhook"] as Model<WebhookDocument>) ||
  model<WebhookDocument>("Webhook", webhookSchema);
