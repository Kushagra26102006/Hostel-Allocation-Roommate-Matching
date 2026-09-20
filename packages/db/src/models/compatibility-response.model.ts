import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export interface ICompatibilityResponse {
  student_id: Types.ObjectId;
  key_id: string;
  iv: string;
  auth_tag: string;
  ciphertext: string;
}

export interface CompatibilityResponseDocument extends BaseTenantDocument, ICompatibilityResponse {}

const compatibilityResponseSchema = new Schema<CompatibilityResponseDocument>(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    key_id: {
      type: String,
      required: true,
      trim: true,
    },
    iv: {
      type: String,
      required: true,
      trim: true,
    },
    auth_tag: {
      type: String,
      required: true,
      trim: true,
    },
    ciphertext: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

compatibilityResponseSchema.plugin(baseSchemaPlugin);

compatibilityResponseSchema.index({ institution_id: 1, student_id: 1 }, { unique: true });

export const CompatibilityResponseModel: Model<CompatibilityResponseDocument> =
  (mongoose.models?.["CompatibilityResponse"] as Model<CompatibilityResponseDocument>) ||
  model<CompatibilityResponseDocument>("CompatibilityResponse", compatibilityResponseSchema);
