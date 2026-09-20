import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type RoomType = "single" | "double" | "triple" | "quad" | "dorm";
export type RoomStatus = "available" | "full" | "maintenance" | "reserved";

export interface IRoom {
  block_id: Types.ObjectId;
  hostel_id: Types.ObjectId;
  room_number: string;
  room_type: RoomType;
  capacity: number;
  accessible: boolean;
  ac: boolean;
  status: RoomStatus;
}

export interface RoomDocument extends BaseTenantDocument, IRoom {}

const roomSchema = new Schema<RoomDocument>(
  {
    block_id: {
      type: Schema.Types.ObjectId,
      ref: "Block",
      required: true,
      index: true,
    },
    hostel_id: {
      type: Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    room_number: {
      type: String,
      required: true,
      trim: true,
    },
    room_type: {
      type: String,
      enum: ["single", "double", "triple", "quad", "dorm"],
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    accessible: {
      type: Boolean,
      default: false,
    },
    ac: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["available", "full", "maintenance", "reserved"],
      default: "available",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

roomSchema.plugin(baseSchemaPlugin);

// Unique room per block within an institution
roomSchema.index({ institution_id: 1, block_id: 1, room_number: 1 }, { unique: true });

export const RoomModel: Model<RoomDocument> =
  (mongoose.models?.["Room"] as Model<RoomDocument>) || model<RoomDocument>("Room", roomSchema);
