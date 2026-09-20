import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";
import type { PromotionTrigger } from "@hostelhub/domain";

export type ProposalStatus = "pending" | "confirmed" | "rejected" | "expired";

export interface IPromotionProposal {
  draft_id: Types.ObjectId;
  cycle_id: Types.ObjectId;
  waitlist_entry_id: Types.ObjectId;
  application_id: Types.ObjectId;
  student_id: Types.ObjectId;
  bed_id: Types.ObjectId;
  room_id: Types.ObjectId;
  hostel_id: Types.ObjectId;
  trigger: PromotionTrigger;
  status: ProposalStatus;
  warden_comment?: string | undefined;
  rejection_reason?: string | undefined;
  created_by?:
    | {
        id: string;
        email: string;
        role: string;
      }
    | undefined;
  resolved_by?:
    | {
        id: string;
        email: string;
        role: string;
      }
    | undefined;
  resolved_at?: Date | undefined;
  expires_at?: Date | undefined;
}

export interface PromotionProposalDocument extends BaseTenantDocument, IPromotionProposal {}

const promotionProposalSchema = new Schema<PromotionProposalDocument>(
  {
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
      required: true,
      index: true,
    },
    cycle_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationCycle",
      required: true,
      index: true,
    },
    waitlist_entry_id: {
      type: Schema.Types.ObjectId,
      ref: "WaitlistEntry",
      required: true,
      index: true,
    },
    application_id: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bed_id: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
    },
    room_id: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    hostel_id: {
      type: Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },
    trigger: {
      type: String,
      enum: [
        "withdrawal",
        "no_show",
        "override_freed",
        "appeal_granted",
        "room_change_approved",
        "manual",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    warden_comment: {
      type: String,
    },
    rejection_reason: {
      type: String,
    },
    created_by: {
      id: String,
      email: String,
      role: String,
    },
    resolved_by: {
      id: String,
      email: String,
      role: String,
    },
    resolved_at: {
      type: Date,
    },
    expires_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "promotion_proposals",
  },
);

promotionProposalSchema.plugin(baseSchemaPlugin);

export const PromotionProposalModel: Model<PromotionProposalDocument> =
  (mongoose.models["PromotionProposal"] as Model<PromotionProposalDocument>) ||
  model<PromotionProposalDocument>("PromotionProposal", promotionProposalSchema);
