import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type GroupMemberStatus = "pending" | "accepted" | "declined";
export type GroupStatus = "draft" | "confirmed" | "disbanded";

export interface IGroupMember {
  student_id: Types.ObjectId;
  email: string;
  status: GroupMemberStatus;
  joined_at: Date;
}

export interface IGroup {
  cycle_id: Types.ObjectId;
  leader_id: Types.ObjectId;
  invite_code: string;
  members: IGroupMember[];
  status: GroupStatus;
}

export interface GroupDocument extends BaseTenantDocument, IGroup {}

const groupMemberSchema = new Schema<IGroupMember>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    joined_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const groupSchema = new Schema<GroupDocument>(
  {
    cycle_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationCycle",
      required: true,
      index: true,
    },
    leader_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invite_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    members: {
      type: [groupMemberSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "confirmed", "disbanded"],
      default: "draft",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

groupSchema.plugin(baseSchemaPlugin);

groupSchema.index({ institution_id: 1, cycle_id: 1, invite_code: 1 }, { unique: true });

export const GroupModel: Model<GroupDocument> =
  (mongoose.models?.["Group"] as Model<GroupDocument>) ||
  model<GroupDocument>("Group", groupSchema);
