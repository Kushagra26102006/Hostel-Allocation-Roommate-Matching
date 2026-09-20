import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export interface IWaitlistEntry {
  draft_id: Types.ObjectId;
  run_id: Types.ObjectId;
  application_id: Types.ObjectId;
  student_id: Types.ObjectId;
  position: number;
  priority_score?: number | undefined;
  quota_bucket: string;
  status?: "waiting" | "promoted" | "proposal_pending" | "skipped" | "withdrawn" | undefined;
  waiting_reason_code?: string | undefined;
  reason?: string | undefined;
  reorder_history?:
    | Array<{
        previousPosition: number;
        newPosition: number;
        reason: string;
        actor: { id: string; email: string; role: string };
        timestamp: string;
      }>
    | undefined;
}

export interface WaitlistEntryDocument extends BaseTenantDocument, IWaitlistEntry {}

const waitlistEntrySchema = new Schema<WaitlistEntryDocument>(
  {
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
      required: true,
      index: true,
    },
    run_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationRun",
      required: true,
      index: true,
    },
    application_id: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    position: {
      type: Number,
      required: true,
    },
    priority_score: {
      type: Number,
      default: 0,
    },
    quota_bucket: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["waiting", "promoted", "proposal_pending", "skipped", "withdrawn"],
      default: "waiting",
      index: true,
    },
    waiting_reason_code: {
      type: String,
    },
    reason: {
      type: String,
    },
    reorder_history: [
      {
        previousPosition: Number,
        newPosition: Number,
        reason: String,
        actor: {
          id: String,
          email: String,
          role: String,
        },
        timestamp: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: "waitlist_entries",
  },
);

waitlistEntrySchema.plugin(baseSchemaPlugin);

// Unique index: an application can only appear once in a waitlist per draft
waitlistEntrySchema.index({ draft_id: 1, application_id: 1 }, { unique: true });
waitlistEntrySchema.index({ draft_id: 1, quota_bucket: 1, position: 1 });

export const WaitlistEntryModel: Model<WaitlistEntryDocument> =
  (mongoose.models["WaitlistEntry"] as Model<WaitlistEntryDocument>) ||
  model<WaitlistEntryDocument>("WaitlistEntry", waitlistEntrySchema);
