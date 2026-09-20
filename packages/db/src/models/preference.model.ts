import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import {
  baseSchemaPlugin,
  type BaseTenantDocument,
} from "../plugins/base-schema.plugin.js";

export interface IPreference {
  application_id: Types.ObjectId;
  student_id: Types.ObjectId;
  rank: number;
  hostel_id: Types.ObjectId;
  room_type: string;
  roommate_ids: Types.ObjectId[];
}

export interface PreferenceDocument
  extends BaseTenantDocument,
    IPreference {}

const preferenceSchema = new Schema<PreferenceDocument>(
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
    rank: {
      type: Number,
      required: true,
      min: 1,
    },
    hostel_id: {
      type: Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    room_type: {
      type: String,
      required: true,
      trim: true,
    },
    roommate_ids: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

preferenceSchema.plugin(baseSchemaPlugin);

// Unique compound index: application_id + rank
preferenceSchema.index(
  { institution_id: 1, application_id: 1, rank: 1 },
  { unique: true },
);

export const PreferenceModel: Model<PreferenceDocument> =
  (mongoose.models?.["Preference"] as Model<PreferenceDocument>) ||
  model<PreferenceDocument>("Preference", preferenceSchema);
