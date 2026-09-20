import mongoose, { Schema, model, type Model } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";
import type { Weights } from "@hostelhub/domain";
import { DEFAULT_WEIGHTS } from "@hostelhub/domain";

export interface IWeightsVersion {
  version_label: string;
  description?: string;
  weights: Weights;
  created_by: string;
  used: boolean;
}

export interface WeightsVersionDocument extends BaseTenantDocument, IWeightsVersion {}

const weightsSchema = new Schema<Weights>(
  {
    wP: { type: Number, required: true, default: DEFAULT_WEIGHTS.wP },
    wC: { type: Number, required: true, default: DEFAULT_WEIGHTS.wC },
    wF: { type: Number, required: true, default: DEFAULT_WEIGHTS.wF },
    wD: { type: Number, required: true, default: DEFAULT_WEIGHTS.wD },
    wK: { type: Number, required: true, default: DEFAULT_WEIGHTS.wK },
  },
  { _id: false },
);

const weightsVersionSchema = new Schema<WeightsVersionDocument>(
  {
    version_label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    weights: {
      type: weightsSchema,
      required: true,
      default: () => ({ ...DEFAULT_WEIGHTS }),
    },
    created_by: {
      type: String,
      required: true,
      trim: true,
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "weights_versions",
  },
);

weightsVersionSchema.plugin(baseSchemaPlugin);

// Unique version_label per institution
weightsVersionSchema.index({ institution_id: 1, version_label: 1 }, { unique: true });

// Immutability protection: once used === true, weights cannot be changed
weightsVersionSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified("weights") && this.used) {
    return next(new Error("WeightsVersion is immutable once marked as used."));
  }
  next();
});

weightsVersionSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as Record<string, unknown> | null;
  if (!update) return next();

  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate?.used) {
    const isModifyingWeights =
      (update.$set && (update.$set as Record<string, unknown>)["weights"]) || update["weights"];
    if (isModifyingWeights) {
      return next(new Error("WeightsVersion is immutable once marked as used."));
    }
  }
  next();
});

export const WeightsVersionModel: Model<WeightsVersionDocument> =
  (mongoose.models["WeightsVersion"] as Model<WeightsVersionDocument>) ||
  model<WeightsVersionDocument>("WeightsVersion", weightsVersionSchema);
