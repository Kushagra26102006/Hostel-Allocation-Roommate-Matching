import mongoose, { Schema, model, type Document, type Types, type Model } from "mongoose";

export interface PushSubscriptionDocument extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string | undefined;
  created_at: Date;
  updated_at: Date;
}

const PushSubscriptionSchema = new Schema<PushSubscriptionDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    user_agent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

export const PushSubscriptionModel: Model<PushSubscriptionDocument> =
  (mongoose.models?.["PushSubscription"] as Model<PushSubscriptionDocument>) ||
  model<PushSubscriptionDocument>("PushSubscription", PushSubscriptionSchema);
