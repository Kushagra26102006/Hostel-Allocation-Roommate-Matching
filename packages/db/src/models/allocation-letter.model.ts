import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type AllocationLetterStatus = "pending" | "generating" | "generated" | "failed";

export interface IAllocationLetter {
  draft_id: Types.ObjectId;
  assignment_id: Types.ObjectId;
  student_id: Types.ObjectId;
  letter_number: string;
  token: string;
  s3_key: string;
  status: AllocationLetterStatus;
  metadata: {
    student_name: string;
    student_email: string;
    roll_number: string;
    institution_name: string;
    cycle_name: string;
    academic_year: string;
    hostel_name: string;
    block_name: string;
    floor_number: number;
    room_number: string;
    bed_no: string;
    issued_date: string;
    move_in_start_date: string;
    move_in_end_date: string;
    terms_version: string;
  };
  generated_at?: Date | undefined;
  error?: string | undefined;
}

export interface AllocationLetterDocument extends BaseTenantDocument, IAllocationLetter {}

const allocationLetterSchema = new Schema<AllocationLetterDocument>(
  {
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
      required: true,
      index: true,
    },
    assignment_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationAssignment",
      required: true,
      index: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    letter_number: {
      type: String,
      required: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
    },
    s3_key: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "generating", "generated", "failed"],
      default: "pending",
      required: true,
      index: true,
    },
    metadata: {
      student_name: { type: String, required: true },
      student_email: { type: String, required: true },
      roll_number: { type: String, required: true },
      institution_name: { type: String, required: true },
      cycle_name: { type: String, required: true },
      academic_year: { type: String, required: true },
      hostel_name: { type: String, required: true },
      block_name: { type: String, required: true },
      floor_number: { type: Number, required: true },
      room_number: { type: String, required: true },
      bed_no: { type: String, required: true },
      issued_date: { type: String, required: true },
      move_in_start_date: { type: String, required: true },
      move_in_end_date: { type: String, required: true },
      terms_version: { type: String, default: "1.0", required: true },
    },
    generated_at: {
      type: Date,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

allocationLetterSchema.plugin(baseSchemaPlugin);

allocationLetterSchema.index({ draft_id: 1, assignment_id: 1 }, { unique: true });
allocationLetterSchema.index({ institution_id: 1, letter_number: 1 }, { unique: true });
allocationLetterSchema.index({ student_id: 1, draft_id: 1 });

export const AllocationLetterModel: Model<AllocationLetterDocument> =
  (mongoose.models?.["AllocationLetter"] as Model<AllocationLetterDocument>) ||
  model<AllocationLetterDocument>("AllocationLetter", allocationLetterSchema);
