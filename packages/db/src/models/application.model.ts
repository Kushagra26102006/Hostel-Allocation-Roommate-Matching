import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import {
  baseSchemaPlugin,
  type BaseTenantDocument,
} from "../plugins/base-schema.plugin.js";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "waitlisted";

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export interface IApplication {
  cycle_id: Types.ObjectId;
  student_id: Types.ObjectId;
  reference_number: string;
  status: ApplicationStatus;
  eligibility_result: EligibilityResult;
  priority_tier: string;
  form_data: Record<string, unknown>;
  submitted_at?: Date | undefined;
}

export interface ApplicationDocument
  extends BaseTenantDocument,
    IApplication {}

const applicationSchema = new Schema<ApplicationDocument>(
  {
    cycle_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationCycle",
      required: true,
      index: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reference_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "under_review", "approved", "rejected", "waitlisted"],
      default: "draft",
      index: true,
    },
    eligibility_result: {
      eligible: { type: Boolean, default: true },
      reasons: { type: [String], default: [] },
    },
    priority_tier: {
      type: String,
      default: "general",
    },
    form_data: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    submitted_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

applicationSchema.plugin(baseSchemaPlugin);

// Unique application per student per cycle within an institution
applicationSchema.index(
  { institution_id: 1, cycle_id: 1, student_id: 1 },
  { unique: true },
);

export const ApplicationModel: Model<ApplicationDocument> =
  (mongoose.models?.["Application"] as Model<ApplicationDocument>) ||
  model<ApplicationDocument>("Application", applicationSchema);
