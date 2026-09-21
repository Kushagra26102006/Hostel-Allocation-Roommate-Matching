import { Schema, model, models, type Document, type Types, type Model } from "mongoose";
import type { NotificationChannel, QuietHoursConfig } from "@hostelhub/domain";

export interface NotificationPreferenceDocument extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  institution_id: Types.ObjectId;
  channels: Array<{ event_type: string; channels: NotificationChannel[] }>;
  quiet_hours: QuietHoursConfig;
  daily_digest: boolean;
  created_at: Date;
  updated_at: Date;
}

const NotificationPreferenceSchema = new Schema<NotificationPreferenceDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    institution_id: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    channels: [
      {
        _id: false,
        event_type: { type: String, required: true },
        channels: [{ type: String }],
      },
    ],
    quiet_hours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: "22:00" },
      end: { type: String, default: "07:00" },
      timezone: { type: String, default: "UTC" },
    },
    daily_digest: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

export const NotificationPreferenceModel: Model<NotificationPreferenceDocument> =
  (models?.["NotificationPreference"] as Model<NotificationPreferenceDocument>) ||
  model<NotificationPreferenceDocument>("NotificationPreference", NotificationPreferenceSchema);
