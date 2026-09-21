import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";
import type { ScenarioDefinition, ScenarioComparison, SimulationResult } from "@hostelhub/domain";

export interface ISimulationScenarioEntry {
  scenario_id: string;
  name: string;
  description?: string | undefined;
  config: ScenarioDefinition;
  run_id: Types.ObjectId;
  draft_id?: Types.ObjectId | undefined;
  metrics: SimulationResult["metrics"];
}

export interface ISimulationBatch {
  base_cycle_id: Types.ObjectId;
  base_run_id?: Types.ObjectId | undefined;
  seed: number;
  scenarios: ISimulationScenarioEntry[];
  comparison: ScenarioComparison;
  created_by?: Types.ObjectId | undefined;
  status: "running" | "completed" | "failed";
  error?: string | undefined;
}

export interface SimulationBatchDocument extends BaseTenantDocument, ISimulationBatch {}

const simulationScenarioEntrySchema = new Schema<ISimulationScenarioEntry>(
  {
    scenario_id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    config: { type: Schema.Types.Mixed, required: true },
    run_id: { type: Schema.Types.ObjectId, ref: "AllocationRun", required: true },
    draft_id: { type: Schema.Types.ObjectId, ref: "AllocationDraft" },
    metrics: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const simulationBatchSchema = new Schema<SimulationBatchDocument>(
  {
    base_cycle_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationCycle",
      required: true,
      index: true,
    },
    base_run_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationRun",
      index: true,
    },
    seed: {
      type: Number,
      required: true,
    },
    scenarios: {
      type: [simulationScenarioEntrySchema],
      required: true,
      default: [],
    },
    comparison: {
      type: Schema.Types.Mixed,
      required: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "completed",
      index: true,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "simulation_batches",
  },
);

simulationBatchSchema.plugin(baseSchemaPlugin);

export const SimulationBatchModel: Model<SimulationBatchDocument> =
  (mongoose.models["SimulationBatch"] as Model<SimulationBatchDocument>) ||
  model<SimulationBatchDocument>("SimulationBatch", simulationBatchSchema);
