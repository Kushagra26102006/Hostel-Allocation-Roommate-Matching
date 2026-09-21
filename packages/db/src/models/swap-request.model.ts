import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type SwapRequestStatus =
  "proposed" | "counterpart_accepted" | "validated" | "completed" | "failed" | "cancelled";

export interface ISwapRequest {
  initiator_student_id: Types.ObjectId;
  counterpart_student_id: Types.ObjectId;
  initiator_assignment_id: Types.ObjectId;
  counterpart_assignment_id: Types.ObjectId;
  draft_id: Types.ObjectId;
  initiator_bed_id: Types.ObjectId;
  counterpart_bed_id: Types.ObjectId;
  initiator_room_id: Types.ObjectId;
  counterpart_room_id: Types.ObjectId;
  initiator_hostel_id: Types.ObjectId;
  counterpart_hostel_id: Types.ObjectId;
  status: SwapRequestStatus;
  initiator_accepted: boolean;
  counterpart_accepted: boolean;
  validation_result?: Record<string, unknown> | undefined;
  failure_reason?: string | undefined;
  cancellation_reason?: string | undefined;
  decided_by?: { user_id: string; email: string; role: string } | undefined;
  decided_at?: Date | undefined;
  amendment_draft_id?: Types.ObjectId | undefined;
}

export interface SwapRequestDocument extends BaseTenantDocument, ISwapRequest {}

const swapRequestSchema = new Schema<SwapRequestDocument>(
  {
    initiator_student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    counterpart_student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    initiator_assignment_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationAssignment",
      required: true,
    },
    counterpart_assignment_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationAssignment",
      required: true,
    },
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
      required: true,
      index: true,
    },
    initiator_bed_id: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
    },
    counterpart_bed_id: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
    },
    initiator_room_id: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    counterpart_room_id: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    initiator_hostel_id: {
      type: Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },
    counterpart_hostel_id: {
      type: Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },
    status: {
      type: String,
      enum: ["proposed", "counterpart_accepted", "validated", "completed", "failed", "cancelled"],
      default: "proposed",
      index: true,
    },
    initiator_accepted: {
      type: Boolean,
      default: true,
    },
    counterpart_accepted: {
      type: Boolean,
      default: false,
    },
    validation_result: {
      type: Schema.Types.Mixed,
    },
    failure_reason: {
      type: String,
      trim: true,
    },
    cancellation_reason: {
      type: String,
      trim: true,
    },
    decided_by: {
      user_id: { type: String },
      email: { type: String },
      role: { type: String },
    },
    decided_at: {
      type: Date,
    },
    amendment_draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
    },
  },
  {
    timestamps: true,
    collection: "swap_requests",
  },
);

swapRequestSchema.plugin(baseSchemaPlugin);

// Participant lookup
swapRequestSchema.index({ initiator_student_id: 1, status: 1, createdAt: -1 });
swapRequestSchema.index({ counterpart_student_id: 1, status: 1, createdAt: -1 });
// Draft + status lookup for warden
swapRequestSchema.index({ draft_id: 1, status: 1 });

export const SwapRequestModel: Model<SwapRequestDocument> =
  (mongoose.models?.["SwapRequest"] as Model<SwapRequestDocument>) ||
  model<SwapRequestDocument>("SwapRequest", swapRequestSchema);
