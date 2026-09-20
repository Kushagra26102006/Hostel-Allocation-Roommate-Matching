import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export interface IBlock {
  hostel_id: Types.ObjectId;
  name: string;
  floor_no: number;
  wing: string;
  lift_access: boolean;
}

export interface BlockDocument extends BaseTenantDocument, IBlock {}

const blockSchema = new Schema<BlockDocument>(
  {
    hostel_id: {
      type: Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    floor_no: {
      type: Number,
      required: true,
    },
    wing: {
      type: String,
      required: true,
      trim: true,
    },
    lift_access: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

blockSchema.plugin(baseSchemaPlugin);

// Compound index for tenant-scoped block and floor lookup
blockSchema.index({ institution_id: 1, hostel_id: 1, name: 1, floor_no: 1 }, { unique: true });

export const BlockModel: Model<BlockDocument> =
  (mongoose.models?.["Block"] as Model<BlockDocument>) ||
  model<BlockDocument>("Block", blockSchema);
