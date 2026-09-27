import mongoose, { Schema, model, type Document, type Types, type Model } from "mongoose";
import {
  NOTIFICATION_EVENT_TYPES,
  type NotificationEventType,
  type NotificationChannel,
  type DeliveryStatus,
} from "@hostelhub/domain";

export interface NotificationDeliveryDocument extends Document {
  _id: Types.ObjectId;
  event_id: string;
  event_type: NotificationEventType;
  user_id?: Types.ObjectId | undefined;
  institution_id: Types.ObjectId;
  recipient: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  attempt_count: number;
  last_error?: string | undefined;
  error_stack?: string | undefined;
  next_retry_at?: Date | undefined;
  delivered_at?: Date | undefined;
  payload: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

const NotificationDeliverySchema = new Schema<NotificationDeliveryDocument>(
  {
    event_id: {
      type: String,
      required: true,
      index: true,
    },
    event_type: {
      type: String,
      enum: NOTIFICATION_EVENT_TYPES,
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    institution_id: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: ["in_app", "email", "push", "sms", "webhook"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "delivered", "failed", "dead_letter"],
      default: "pending",
      index: true,
    },
    attempt_count: {
      type: Number,
      default: 1,
      min: 1,
    },
    last_error: {
      type: String,
    },
    error_stack: {
      type: String,
    },
    next_retry_at: {
      type: Date,
      index: true,
    },
    delivered_at: {
      type: Date,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

// Indexes for DLQ inspection and background retry queries
NotificationDeliverySchema.index({ status: 1, next_retry_at: 1 });
NotificationDeliverySchema.index({ event_id: 1, channel: 1 });
NotificationDeliverySchema.index({ institution_id: 1, status: 1 });

export const NotificationDeliveryModel: Model<NotificationDeliveryDocument> =
  (mongoose.models?.["NotificationDelivery"] as Model<NotificationDeliveryDocument>) ||
  model<NotificationDeliveryDocument>("NotificationDelivery", NotificationDeliverySchema);
