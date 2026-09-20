import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type DocumentScanStatus = "pending_scan" | "clean" | "quarantined" | "verified" | "rejected";

export interface DocumentVerifiedBy {
  user_id: string;
  email: string;
  at: Date;
}

export interface IApplicationDocument {
  application_id: Types.ObjectId;
  student_id: Types.ObjectId;
  type: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: DocumentScanStatus;
  rejection_reason?: string | undefined;
  verified_by?: DocumentVerifiedBy | undefined;
}

export interface ApplicationDocumentDocument extends BaseTenantDocument, IApplicationDocument {}

const applicationDocumentSchema = new Schema<ApplicationDocumentDocument>(
  {
    application_id: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    storage_key: {
      type: String,
      required: true,
      trim: true,
    },
    original_name: {
      type: String,
      required: true,
      trim: true,
    },
    mime_type: {
      type: String,
      required: true,
      trim: true,
    },
    size_bytes: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending_scan", "clean", "quarantined", "verified", "rejected"],
      default: "pending_scan",
      index: true,
    },
    rejection_reason: {
      type: String,
      trim: true,
    },
    verified_by: {
      user_id: { type: String },
      email: { type: String },
      at: { type: Date },
    },
  },
  {
    timestamps: true,
  },
);

applicationDocumentSchema.plugin(baseSchemaPlugin);

applicationDocumentSchema.index(
  { institution_id: 1, application_id: 1, type: 1 },
  { unique: false },
);

export const ApplicationDocumentModel: Model<ApplicationDocumentDocument> =
  (mongoose.models?.["ApplicationDocument"] as Model<ApplicationDocumentDocument>) ||
  model<ApplicationDocumentDocument>("ApplicationDocument", applicationDocumentSchema);
