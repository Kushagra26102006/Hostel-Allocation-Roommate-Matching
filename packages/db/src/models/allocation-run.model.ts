import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";
import type { RunMetrics } from "@hostelhub/domain";

export type AllocationRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface AllocationRunProgress {
  stage: string;
  percent: number;
  message: string;
  current?: number;
  total?: number;
}

export interface IAllocationRun {
  cycle_id: Types.ObjectId;
  seed: number;
  weights_version: string;
  rules_version: string;
  engine_version: string;
  input_hash: string;
  status: AllocationRunStatus;
  progress: AllocationRunProgress;
  metrics?: RunMetrics | undefined;
  dry_run: boolean;
  error?: string | undefined;
  draft_id?: Types.ObjectId | undefined;
  started_at?: Date | undefined;
  completed_at?: Date | undefined;
  cancelled_at?: Date | undefined;
  idempotency_key?: string | undefined;
  created_by?: string | undefined;
}

export interface AllocationRunDocument extends BaseTenantDocument, IAllocationRun {}

const progressSchema = new Schema<AllocationRunProgress>(
  {
    stage: { type: String, required: true, default: "freeze" },
    percent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    message: { type: String, required: true, default: "Initializing..." },
    current: { type: Number },
    total: { type: Number },
  },
  { _id: false },
);

const allocationRunSchema = new Schema<AllocationRunDocument>(
  {
    cycle_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationCycle",
      required: true,
      index: true,
    },
    seed: {
      type: Number,
      required: true,
    },
    weights_version: {
      type: String,
      required: true,
      default: "default",
    },
    rules_version: {
      type: String,
      required: true,
      default: "1.0.0",
    },
    engine_version: {
      type: String,
      required: true,
      default: "1.0.0",
    },
    input_hash: {
      type: String,
      required: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "cancelled"],
      default: "queued",
      index: true,
    },
    progress: {
      type: progressSchema,
      required: true,
      default: () => ({
        stage: "freeze",
        percent: 0,
        message: "Queued for execution",
      }),
    },
    metrics: {
      type: Schema.Types.Mixed,
    },
    dry_run: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
    },
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
    },
    started_at: {
      type: Date,
    },
    completed_at: {
      type: Date,
    },
    cancelled_at: {
      type: Date,
    },
    idempotency_key: {
      type: String,
      index: true,
    },
    created_by: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "allocation_runs",
  },
);

allocationRunSchema.plugin(baseSchemaPlugin);

allocationRunSchema.index({ institution_id: 1, cycle_id: 1, createdAt: -1 });
allocationRunSchema.index(
  { institution_id: 1, idempotency_key: 1 },
  { unique: true, partialFilterExpression: { idempotency_key: { $type: "string" } } },
);

export const AllocationRunModel: Model<AllocationRunDocument> =
  (mongoose.models["AllocationRun"] as Model<AllocationRunDocument>) ||
  model<AllocationRunDocument>("AllocationRun", allocationRunSchema);
