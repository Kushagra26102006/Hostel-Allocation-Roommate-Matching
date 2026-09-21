import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type AppealModelStatus =
  "submitted" | "warden_review" | "chief_warden_review" | "upheld" | "partly_upheld" | "rejected";

export type AppealModelOutcome = "upheld" | "partly_upheld" | "rejected";

export interface IAppealDecision {
  outcome: AppealModelOutcome;
  reason: string;
  decided_by: {
    user_id: string;
    email: string;
    role: string;
  };
  decided_at: Date;
}

export interface IAppeal {
  student_id: Types.ObjectId;
  assignment_id: Types.ObjectId;
  draft_id: Types.ObjectId;
  statement: string;
  evidence_keys: string[];
  status: AppealModelStatus;
  sla_due_at: Date;
  sla_config_days: number;
  current_reviewer_role: "warden" | "chief_warden";
  warden_decision?: IAppealDecision | undefined;
  chief_warden_decision?: IAppealDecision | undefined;
  final_outcome?: AppealModelOutcome | undefined;
  amendment_draft_id?: Types.ObjectId | undefined;
  escalated_at?: Date | undefined;
  escalation_reason?: string | undefined;
}

export interface AppealDocument extends BaseTenantDocument, IAppeal {}

const appealDecisionSchema = new Schema<IAppealDecision>(
  {
    outcome: {
      type: String,
      enum: ["upheld", "partly_upheld", "rejected"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, "Decision reason must be at least 10 characters"],
    },
    decided_by: {
      user_id: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true },
    },
    decided_at: {
      type: Date,
      required: true,
    },
  },
  { _id: false },
);

const appealSchema = new Schema<AppealDocument>(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignment_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationAssignment",
      required: true,
      index: true,
    },
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
      required: true,
      index: true,
    },
    statement: {
      type: String,
      required: true,
      trim: true,
      minlength: [20, "Appeal statement must be at least 20 characters"],
    },
    evidence_keys: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: [
        "submitted",
        "warden_review",
        "chief_warden_review",
        "upheld",
        "partly_upheld",
        "rejected",
      ],
      default: "submitted",
      index: true,
    },
    sla_due_at: {
      type: Date,
      required: true,
      index: true,
    },
    sla_config_days: {
      type: Number,
      required: true,
      default: 3,
    },
    current_reviewer_role: {
      type: String,
      enum: ["warden", "chief_warden"],
      default: "warden",
    },
    warden_decision: {
      type: appealDecisionSchema,
    },
    chief_warden_decision: {
      type: appealDecisionSchema,
    },
    final_outcome: {
      type: String,
      enum: ["upheld", "partly_upheld", "rejected"],
    },
    amendment_draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
    },
    escalated_at: {
      type: Date,
    },
    escalation_reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "appeals",
  },
);

appealSchema.plugin(baseSchemaPlugin);

// Student lookup
appealSchema.index({ student_id: 1, status: 1, createdAt: -1 });
// Escalation job: find overdue warden_review appeals
appealSchema.index({ status: 1, sla_due_at: 1 });
// Draft lookup
appealSchema.index({ draft_id: 1, status: 1 });
// Prevent duplicate active appeals per assignment
appealSchema.index(
  { student_id: 1, assignment_id: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["submitted", "warden_review", "chief_warden_review"] },
    },
  },
);

export const AppealModel: Model<AppealDocument> =
  (mongoose.models?.["Appeal"] as Model<AppealDocument>) ||
  model<AppealDocument>("Appeal", appealSchema);
