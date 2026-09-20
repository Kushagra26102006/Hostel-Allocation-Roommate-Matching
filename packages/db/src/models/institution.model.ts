import mongoose, { Schema, model, type Document, type Model } from "mongoose";

export interface IInstitution {
  name: string;
  code: string;
  status: "active" | "suspended" | "pending";
  domain?: string;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstitutionDocument extends Document, IInstitution {}

const institutionSchema = new Schema<InstitutionDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "active",
      index: true,
    },
    domain: {
      type: String,
      trim: true,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export const InstitutionModel: Model<InstitutionDocument> =
  (mongoose.models?.["Institution"] as Model<InstitutionDocument>) ||
  model<InstitutionDocument>("Institution", institutionSchema);
