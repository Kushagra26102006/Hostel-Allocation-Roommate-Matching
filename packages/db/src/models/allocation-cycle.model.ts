import mongoose, { Schema, model, type Model } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type AllocationCycleStatus = "draft" | "scheduled" | "open" | "closed" | "archived";

export interface QuotaBucket {
  name: string;
  capacity: number;
}

export interface DocumentRequirement {
  type: string;
  label: string;
  required: boolean;
}

export interface RemindersSent {
  "48h"?: Date | undefined;
  "6h"?: Date | undefined;
}

export interface IAllocationCycle {
  academic_year: string;
  name: string;
  window_open: Date;
  window_close: Date;
  quota_buckets: QuotaBucket[];
  document_requirements: DocumentRequirement[];
  priority_tier_order: string[];
  status: AllocationCycleStatus;
  reminders_sent?: RemindersSent | undefined;
}

export interface AllocationCycleDocument extends BaseTenantDocument, IAllocationCycle {}

const quotaBucketSchema = new Schema<QuotaBucket>(
  {
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const documentRequirementSchema = new Schema<DocumentRequirement>(
  {
    type: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    required: { type: Boolean, default: true },
  },
  { _id: false },
);

const allocationCycleSchema = new Schema<AllocationCycleDocument>(
  {
    academic_year: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    window_open: {
      type: Date,
      required: true,
    },
    window_close: {
      type: Date,
      required: true,
    },
    quota_buckets: {
      type: [quotaBucketSchema],
      default: [],
    },
    document_requirements: {
      type: [documentRequirementSchema],
      default: [],
    },
    priority_tier_order: {
      type: [String],
      default: ["pwd", "single_parent", "merit", "general"],
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "open", "closed", "archived"],
      default: "draft",
      index: true,
    },
    reminders_sent: {
      "48h": { type: Date },
      "6h": { type: Date },
    },
  },
  {
    timestamps: true,
  },
);

allocationCycleSchema.plugin(baseSchemaPlugin);

allocationCycleSchema.index({ institution_id: 1, academic_year: 1, name: 1 }, { unique: true });

export const AllocationCycleModel: Model<AllocationCycleDocument> =
  (mongoose.models?.["AllocationCycle"] as Model<AllocationCycleDocument>) ||
  model<AllocationCycleDocument>("AllocationCycle", allocationCycleSchema);
