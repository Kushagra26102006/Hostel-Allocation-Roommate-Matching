import mongoose, { Schema, model, type Model } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export interface IAcademicBlock {
  name: string;
  short_code: string;
  location: { lat: number; lng: number };
}

export interface AcademicBlockDocument extends BaseTenantDocument, IAcademicBlock {}

const academicBlockSchema = new Schema<AcademicBlockDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    short_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    location: {
      type: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      required: true,
      _id: false,
    },
  },
  {
    timestamps: true,
  },
);

academicBlockSchema.plugin(baseSchemaPlugin);

// Compound index for tenant-scoped unique academic block names
academicBlockSchema.index({ institution_id: 1, short_code: 1 }, { unique: true });

export const AcademicBlockModel: Model<AcademicBlockDocument> =
  (mongoose.models?.["AcademicBlock"] as Model<AcademicBlockDocument>) ||
  model<AcademicBlockDocument>("AcademicBlock", academicBlockSchema);
