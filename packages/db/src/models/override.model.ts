import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export interface IOverrideActor {
  id: string;
  role: string;
  email: string;
}

export interface IOverride {
  draft_id: Types.ObjectId;
  assignment_id: Types.ObjectId;
  application_id: Types.ObjectId;
  actor: IOverrideActor;
  from_bed_id: Types.ObjectId;
  to_bed_id: Types.ObjectId;
  reason: string;
  escalated: boolean;
  escalation_reasons?: string[] | undefined;
}

export interface OverrideDocument extends BaseTenantDocument, IOverride {}

const overrideSchema = new Schema<OverrideDocument>(
  {
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
      required: true,
      index: true,
    },
    assignment_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationAssignment",
      required: true,
      index: true,
    },
    application_id: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    actor: {
      id: { type: String, required: true },
      role: { type: String, required: true },
      email: { type: String, required: true },
    },
    from_bed_id: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
    },
    to_bed_id: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      minlength: [10, "Override reason must be at least 10 characters"],
      trim: true,
    },
    escalated: {
      type: Boolean,
      required: true,
      default: false,
    },
    escalation_reasons: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "allocation_overrides",
  },
);

overrideSchema.plugin(baseSchemaPlugin);

overrideSchema.index({ draft_id: 1, assignment_id: 1 });
overrideSchema.index({ draft_id: 1, escalated: 1 });

export const OverrideModel: Model<OverrideDocument> =
  (mongoose.models["Override"] as Model<OverrideDocument>) ||
  model<OverrideDocument>("Override", overrideSchema);
