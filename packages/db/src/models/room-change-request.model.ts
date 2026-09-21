import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type RoomChangeRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface IRoomChangeDecidedBy {
  user_id: string;
  email: string;
  role: string;
}

export interface IRoomChangeRequest {
  student_id: Types.ObjectId;
  assignment_id: Types.ObjectId;
  draft_id: Types.ObjectId;
  from_bed_id: Types.ObjectId;
  from_room_id: Types.ObjectId;
  from_hostel_id: Types.ObjectId;
  to_bed_id?: Types.ObjectId | undefined;
  reason: string;
  evidence_keys: string[];
  status: RoomChangeRequestStatus;
  decided_by?: IRoomChangeDecidedBy | undefined;
  decision_reason?: string | undefined;
  decided_at?: Date | undefined;
  amendment_draft_id?: Types.ObjectId | undefined;
  constraints_checked?: string[] | undefined;
}

export interface RoomChangeRequestDocument extends BaseTenantDocument, IRoomChangeRequest {}

const roomChangeRequestSchema = new Schema<RoomChangeRequestDocument>(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignment_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationAssignment",
      required: true,
      index: true,
    },
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
      required: true,
      index: true,
    },
    from_bed_id: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
    },
    from_room_id: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    from_hostel_id: {
      type: Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },
    to_bed_id: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, "Room change reason must be at least 10 characters"],
    },
    evidence_keys: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    decided_by: {
      user_id: { type: String },
      email: { type: String },
      role: { type: String },
    },
    decision_reason: {
      type: String,
      trim: true,
    },
    decided_at: {
      type: Date,
    },
    amendment_draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
    },
    constraints_checked: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "room_change_requests",
  },
);

roomChangeRequestSchema.plugin(baseSchemaPlugin);

// Student lookup: find my requests
roomChangeRequestSchema.index({ student_id: 1, status: 1, createdAt: -1 });
// Warden lookup: find pending requests for a draft
roomChangeRequestSchema.index({ draft_id: 1, status: 1, createdAt: -1 });
// Prevent duplicate pending requests
roomChangeRequestSchema.index(
  { student_id: 1, assignment_id: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  },
);

export const RoomChangeRequestModel: Model<RoomChangeRequestDocument> =
  (mongoose.models?.["RoomChangeRequest"] as Model<RoomChangeRequestDocument>) ||
  model<RoomChangeRequestDocument>("RoomChangeRequest", roomChangeRequestSchema);
