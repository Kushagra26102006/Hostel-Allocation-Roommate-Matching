import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import {
  baseSchemaPlugin,
  type BaseTenantDocument,
} from "../plugins/base-schema.plugin.js";

export interface IConsentRecord {
  student_id: Types.ObjectId;
  purpose: string;
  granted_at: Date;
  withdrawn_at?: Date | undefined;
  text_version: string;
}

export interface ConsentRecordDocument
  extends BaseTenantDocument,
    IConsentRecord {}

const consentRecordSchema = new Schema<ConsentRecordDocument>(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    granted_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    withdrawn_at: {
      type: Date,
    },
    text_version: {
      type: String,
      default: "1.0",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

consentRecordSchema.plugin(baseSchemaPlugin);

consentRecordSchema.index(
  { institution_id: 1, student_id: 1, purpose: 1 },
  { unique: true },
);

export const ConsentRecordModel: Model<ConsentRecordDocument> =
  (mongoose.models?.["ConsentRecord"] as Model<ConsentRecordDocument>) ||
  model<ConsentRecordDocument>("ConsentRecord", consentRecordSchema);
