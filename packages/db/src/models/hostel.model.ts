import mongoose, { Schema, model, type Model } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type GenderPolicy = "male" | "female" | "coed";
export type HostelStatus = "active" | "inactive" | "maintenance";

export interface IChecklistItemConfig {
  id: string;
  label: string;
  category: "furniture" | "electrical" | "plumbing" | "fixtures" | "general";
  required?: boolean;
  description?: string;
}

export interface IHostel {
  name: string;
  gender_policy: GenderPolicy;
  address: string;
  status: HostelStatus;
  location?: { lat: number; lng: number };
  inspection_checklist_template?: IChecklistItemConfig[];
}

export interface HostelDocument extends BaseTenantDocument, IHostel {}

const hostelSchema = new Schema<HostelDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    gender_policy: {
      type: String,
      enum: ["male", "female", "coed"],
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
      index: true,
    },
    location: {
      type: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      required: false,
      _id: false,
    },
    inspection_checklist_template: {
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          category: {
            type: String,
            enum: ["furniture", "electrical", "plumbing", "fixtures", "general"],
            default: "general",
          },
          required: { type: Boolean, default: true },
          description: { type: String, required: false },
        },
      ],
      required: false,
      _id: false,
    },
  },
  {
    timestamps: true,
  },
);

hostelSchema.plugin(baseSchemaPlugin);

// Compound index for tenant-scoped hostel name lookups
hostelSchema.index({ institution_id: 1, name: 1 }, { unique: true });

export const HostelModel: Model<HostelDocument> =
  (mongoose.models?.["Hostel"] as Model<HostelDocument>) ||
  model<HostelDocument>("Hostel", hostelSchema);
