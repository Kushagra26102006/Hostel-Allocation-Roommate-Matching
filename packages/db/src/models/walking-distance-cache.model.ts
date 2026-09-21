import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export interface IWalkingDistanceCache {
  hostel_id: Types.ObjectId;
  academic_block_id: Types.ObjectId;
  walking_minutes: number;
  distance_meters: number;
  source: "ors" | "haversine";
  computed_at: Date;
}

export interface WalkingDistanceCacheDocument extends BaseTenantDocument, IWalkingDistanceCache {}

const walkingDistanceCacheSchema = new Schema<WalkingDistanceCacheDocument>(
  {
    hostel_id: {
      type: Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    academic_block_id: {
      type: Schema.Types.ObjectId,
      ref: "AcademicBlock",
      required: true,
      index: true,
    },
    walking_minutes: {
      type: Number,
      required: true,
      min: 0,
    },
    distance_meters: {
      type: Number,
      required: true,
      min: 0,
    },
    source: {
      type: String,
      enum: ["ors", "haversine"],
      required: true,
    },
    computed_at: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  },
);

walkingDistanceCacheSchema.plugin(baseSchemaPlugin);

// Unique compound index: one cache entry per hostel–block pair per institution
walkingDistanceCacheSchema.index(
  { institution_id: 1, hostel_id: 1, academic_block_id: 1 },
  { unique: true },
);

export const WalkingDistanceCacheModel: Model<WalkingDistanceCacheDocument> =
  (mongoose.models?.["WalkingDistanceCache"] as Model<WalkingDistanceCacheDocument>) ||
  model<WalkingDistanceCacheDocument>("WalkingDistanceCache", walkingDistanceCacheSchema);
