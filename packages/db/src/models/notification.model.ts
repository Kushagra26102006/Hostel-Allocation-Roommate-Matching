import mongoose, { Schema, model, type Document, type Types, type Model } from "mongoose";
import {
  NOTIFICATION_EVENT_TYPES,
  type NotificationEventType,
  type NotificationPriority,
} from "@hostelhub/domain";

export type NotificationCategory = "application" | "allocation" | "warden" | "system";

export interface NotificationDocument extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  institution_id: Types.ObjectId;
  event_id: string;
  event_type: NotificationEventType;
  title: string;
  message: string;
  deep_link: string;
  read: boolean;
  read_at?: Date | undefined;
  category: NotificationCategory;
  priority: NotificationPriority;
  created_at: Date;
  updated_at: Date;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    institution_id: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    deep_link: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    read_at: {
      type: Date,
    },
    category: {
      type: String,
      enum: ["application", "allocation", "warden", "system"],
      default: "application",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "urgent"],
      default: "normal",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

// Query optimization for inbox
NotificationSchema.index({ user_id: 1, read: 1, created_at: -1 });
NotificationSchema.index({ institution_id: 1, created_at: -1 });

export const NotificationModel: Model<NotificationDocument> =
  (mongoose.models?.["Notification"] as Model<NotificationDocument>) ||
  model<NotificationDocument>("Notification", NotificationSchema);
