import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";
import type { RunMetrics, DraftStatus } from "@hostelhub/domain";

export type AllocationDraftStatus =
  DraftStatus | "draft" | "pending_approval" | "published" | "discarded";

export interface IAllocationDraft {
  cycle_id: Types.ObjectId;
  run_id: Types.ObjectId;
  status: AllocationDraftStatus;
  version_number: number;
  approval_id?: string | undefined;
  published_at?: Date | undefined;
  input_hash: string;
  seed: number;
  metrics?: RunMetrics | undefined;
}

export interface AllocationDraftDocument extends BaseTenantDocument, IAllocationDraft {
  _originalStatus?: AllocationDraftStatus;
}

const ALL_STATUSES = [
  "GENERATING",
  "DRAFT_READY",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "CHANGES_REQUESTED",
  "FAILED",
  "DISCARDED",
  "AMENDED",
  "ARCHIVED",
  "draft",
  "pending_approval",
  "published",
  "discarded",
];

const allocationDraftSchema = new Schema<AllocationDraftDocument>(
  {
    cycle_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationCycle",
      required: true,
      index: true,
    },
    run_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationRun",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ALL_STATUSES,
      default: "DRAFT_READY",
      index: true,
      validate: {
        validator: function (this: IAllocationDraft, val: string) {
          // Layer b: Database validation rejects status PUBLISHED when approval_id is missing
          if (val === "PUBLISHED" || val === "published") {
            return Boolean(this.approval_id);
          }
          return true;
        },
        message: "Database validation failed: status PUBLISHED requires approval_id",
      },
    },
    version_number: {
      type: Number,
      required: true,
      default: 1,
    },
    approval_id: {
      type: String,
    },
    published_at: {
      type: Date,
    },
    input_hash: {
      type: String,
      required: true,
    },
    seed: {
      type: Number,
      required: true,
    },
    metrics: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: "allocation_drafts",
  },
);

allocationDraftSchema.plugin(baseSchemaPlugin);

allocationDraftSchema.index({ institution_id: 1, cycle_id: 1, version_number: 1 });
allocationDraftSchema.index({ run_id: 1, version_number: 1 }, { unique: true });

// Track initial status for read-only checks
allocationDraftSchema.post("init", function () {
  this._originalStatus = this.status;
});

// Layer b & c: Pre-save protection
allocationDraftSchema.pre("save", function (next) {
  // Layer b: direct model write check
  if ((this.status === "PUBLISHED" || this.status === "published") && !this.approval_id) {
    return next(new Error("Database validation failed: status PUBLISHED requires approval_id"));
  }

  // Layer c: Read-only published rows
  if (!this.isNew && this.isModified()) {
    const orig = this._originalStatus;
    if (orig === "PUBLISHED" || orig === "published") {
      if (this.status !== "AMENDED" && this.status !== "ARCHIVED") {
        return next(new Error("Published drafts are read-only and cannot be updated"));
      }
    }
  }

  next();
});

// Layer b & c: Pre-update protection
allocationDraftSchema.pre(["updateOne", "findOneAndUpdate"], async function (next) {
  try {
    const rawUpdate = this.getUpdate();
    if (!rawUpdate) return next();
    const update = rawUpdate as Record<string, unknown> & {
      status?: string;
      approval_id?: string;
      $set?: { status?: string; approval_id?: string };
    };

    const query = this.getQuery();
    const existing = await this.model
      .findOne(query)
      .select("status approval_id")
      .lean<{ status?: string; approval_id?: string }>();

    const newStatus = update.status ?? update.$set?.status;
    const newApprovalId = update.approval_id ?? update.$set?.approval_id;

    // Layer b: Rejects setting status to PUBLISHED without approval_id
    if (newStatus === "PUBLISHED" || newStatus === "published") {
      const finalApprovalId = newApprovalId ?? existing?.approval_id;
      if (!finalApprovalId) {
        return next(new Error("Database validation failed: status PUBLISHED requires approval_id"));
      }
    }

    // Layer c: Rejects updating already PUBLISHED drafts unless transitioning to AMENDED or ARCHIVED
    if (existing && (existing.status === "PUBLISHED" || existing.status === "published")) {
      if (newStatus !== "AMENDED" && newStatus !== "ARCHIVED") {
        return next(new Error("Published drafts are read-only and cannot be updated"));
      }
    }

    next();
  } catch (err) {
    next(err as Error);
  }
});

// Layer c: Pre-delete protection
allocationDraftSchema.pre(["deleteOne", "findOneAndDelete"], async function (next) {
  try {
    const query = this.getQuery();
    const existing = await this.model.findOne(query).select("status").lean<{ status?: string }>();
    if (existing && (existing.status === "PUBLISHED" || existing.status === "published")) {
      return next(new Error("Published drafts are read-only and cannot be deleted"));
    }
    next();
  } catch (err) {
    next(err as Error);
  }
});

export const AllocationDraftModel: Model<AllocationDraftDocument> =
  (mongoose.models["AllocationDraft"] as Model<AllocationDraftDocument>) ||
  model<AllocationDraftDocument>("AllocationDraft", allocationDraftSchema);
