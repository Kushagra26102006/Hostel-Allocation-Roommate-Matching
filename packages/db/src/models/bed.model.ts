import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import {
  baseSchemaPlugin,
  type BaseTenantDocument,
} from "../plugins/base-schema.plugin.js";

export type BedStatus = "available" | "held" | "out_of_service" | "occupied";

export interface BedAttributes {
  window?: boolean;
  distance_to_blocks?: number;
  [key: string]: unknown;
}

export interface IBed {
  room_id: Types.ObjectId;
  bed_no: string;
  status: BedStatus;
  attributes: BedAttributes;
}

export interface BedDocument extends BaseTenantDocument, IBed {}

const bedSchema = new Schema<BedDocument>(
  {
    room_id: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    bed_no: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["available", "held", "out_of_service", "occupied"],
      default: "available",
      index: true,
    },
    attributes: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

bedSchema.plugin(baseSchemaPlugin);

// Unique bed per room within an institution
bedSchema.index(
  { institution_id: 1, room_id: 1, bed_no: 1 },
  { unique: true },
);

export const BedModel: Model<BedDocument> =
  (mongoose.models?.["Bed"] as Model<BedDocument>) ||
  model<BedDocument>("Bed", bedSchema);
