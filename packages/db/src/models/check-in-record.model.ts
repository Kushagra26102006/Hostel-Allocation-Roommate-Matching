import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type CheckInStatus = "checked_in" | "checked_out" | "no_show";
export type ChecklistItemCondition = "good" | "fair" | "damaged" | "missing";

export interface IChecklistItemDoc {
  item_id: string;
  label: string;
  category: "furniture" | "electrical" | "plumbing" | "fixtures" | "general";
  condition: ChecklistItemCondition;
  notes?: string | undefined;
  photo_s3_key?: string | undefined;
  photo_url?: string | undefined;
}

export interface IChecklistDiffDoc {
  item_id: string;
  label: string;
  category: string;
  check_in_condition: ChecklistItemCondition;
  check_out_condition: ChecklistItemCondition;
  worsened: boolean;
  liability_assessed: boolean;
  notes?: string | undefined;
  photo_url?: string | undefined;
}

export interface ICheckInRecord {
  draft_id: Types.ObjectId;
  assignment_id: Types.ObjectId;
  student_id: Types.ObjectId;
  hostel_id: Types.ObjectId;
  room_id: Types.ObjectId;
  bed_id: Types.ObjectId;
  letter_id: string;
  letter_number: string;
  token: string;
  status: CheckInStatus;
  check_in: {
    warden_id: Types.ObjectId;
    warden_name: string;
    time: Date;
    notes?: string | undefined;
  };
  room_condition_checklist: IChecklistItemDoc[];
  student_acknowledgement?:
    | {
        acknowledged: boolean;
        acknowledged_at?: Date | undefined;
        student_notes?: string | undefined;
        signature_hash?: string | undefined;
      }
    | undefined;
  check_out?:
    | {
        warden_id: Types.ObjectId;
        warden_name: string;
        time: Date;
        checklist: IChecklistItemDoc[];
        differences: IChecklistDiffDoc[];
        damage_liability_flag: boolean;
        notes?: string | undefined;
      }
    | undefined;
  no_show?:
    | {
        marked_by_warden_id: Types.ObjectId;
        marked_at: Date;
        reason: string;
        promotion_triggered: boolean;
        promoted_student_id?: Types.ObjectId | undefined;
      }
    | undefined;
  offline_metadata?:
    | {
        scanned_offline: boolean;
        client_scanned_at?: Date | undefined;
        synced_at?: Date | undefined;
        client_sync_id?: string | undefined;
      }
    | undefined;
}

export interface CheckInRecordDocument extends BaseTenantDocument, ICheckInRecord {}

const checklistItemSchema = new Schema<IChecklistItemDoc>(
  {
    item_id: { type: String, required: true },
    label: { type: String, required: true },
    category: {
      type: String,
      enum: ["furniture", "electrical", "plumbing", "fixtures", "general"],
      default: "general",
    },
    condition: {
      type: String,
      enum: ["good", "fair", "damaged", "missing"],
      required: true,
      default: "good",
    },
    notes: { type: String, required: false },
    photo_s3_key: { type: String, required: false },
    photo_url: { type: String, required: false },
  },
  { _id: false },
);

const checklistDiffSchema = new Schema<IChecklistDiffDoc>(
  {
    item_id: { type: String, required: true },
    label: { type: String, required: true },
    category: { type: String, required: true },
    check_in_condition: {
      type: String,
      enum: ["good", "fair", "damaged", "missing"],
      required: true,
    },
    check_out_condition: {
      type: String,
      enum: ["good", "fair", "damaged", "missing"],
      required: true,
    },
    worsened: { type: Boolean, required: true },
    liability_assessed: { type: Boolean, required: true },
    notes: { type: String, required: false },
    photo_url: { type: String, required: false },
  },
  { _id: false },
);

const checkInRecordSchema = new Schema<CheckInRecordDocument>(
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
    hostel_id: {
      type: Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    room_id: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    bed_id: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
      index: true,
    },
    letter_id: {
      type: String,
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
    },
    status: {
      type: String,
      enum: ["checked_in", "checked_out", "no_show"],
      default: "checked_in",
      index: true,
    },
    check_in: {
      warden_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
      warden_name: { type: String, required: true },
      time: { type: Date, required: true, default: Date.now },
      notes: { type: String, required: false },
    },
    room_condition_checklist: {
      type: [checklistItemSchema],
      default: [],
    },
    student_acknowledgement: {
      type: {
        acknowledged: { type: Boolean, default: false },
        acknowledged_at: { type: Date, required: false },
        student_notes: { type: String, required: false },
        signature_hash: { type: String, required: false },
      },
      required: false,
      _id: false,
    },
    check_out: {
      type: {
        warden_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        warden_name: { type: String, required: true },
        time: { type: Date, required: true, default: Date.now },
        checklist: { type: [checklistItemSchema], default: [] },
        differences: { type: [checklistDiffSchema], default: [] },
        damage_liability_flag: { type: Boolean, default: false },
        notes: { type: String, required: false },
      },
      required: false,
      _id: false,
    },
    no_show: {
      type: {
        marked_by_warden_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        marked_at: { type: Date, required: true, default: Date.now },
        reason: { type: String, required: true },
        promotion_triggered: { type: Boolean, default: false },
        promoted_student_id: { type: Schema.Types.ObjectId, ref: "User", required: false },
      },
      required: false,
      _id: false,
    },
    offline_metadata: {
      type: {
        scanned_offline: { type: Boolean, default: false },
        client_scanned_at: { type: Date, required: false },
        synced_at: { type: Date, required: false },
        client_sync_id: { type: String, required: false, index: true },
      },
      required: false,
      _id: false,
    },
  },
  {
    timestamps: true,
  },
);

checkInRecordSchema.plugin(baseSchemaPlugin);

// Compound index: unique active check-in per assignment per tenant
checkInRecordSchema.index({ institution_id: 1, assignment_id: 1 }, { unique: true });
checkInRecordSchema.index({ institution_id: 1, student_id: 1 });
checkInRecordSchema.index({ institution_id: 1, hostel_id: 1, status: 1 });

export const CheckInRecordModel: Model<CheckInRecordDocument> =
  (mongoose.models?.["CheckInRecord"] as Model<CheckInRecordDocument>) ||
  model<CheckInRecordDocument>("CheckInRecord", checkInRecordSchema);
