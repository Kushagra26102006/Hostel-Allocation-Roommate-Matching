import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export interface IApproverInfo {
  id: string;
  role: string;
  email: string;
}

export interface IApprovalRecord {
  draft_id: Types.ObjectId;
  approver: IApproverInfo;
  second_approver?: IApproverInfo | undefined;
  comment: string;
  approved_at: Date;
}

export interface ApprovalRecordDocument extends BaseTenantDocument, IApprovalRecord {}

const approvalRecordSchema = new Schema<ApprovalRecordDocument>(
  {
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
      required: true,
      index: true,
    },
    approver: {
      id: { type: String, required: true },
      role: { type: String, required: true },
      email: { type: String, required: true },
    },
    second_approver: {
      id: { type: String },
      role: { type: String },
      email: { type: String },
    },
    comment: {
      type: String,
      required: true,
      default: "",
    },
    approved_at: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    collection: "allocation_approval_records",
  },
);

approvalRecordSchema.plugin(baseSchemaPlugin);

approvalRecordSchema.index({ draft_id: 1, approved_at: -1 });

export const ApprovalRecordModel: Model<ApprovalRecordDocument> =
  (mongoose.models["ApprovalRecord"] as Model<ApprovalRecordDocument>) ||
  model<ApprovalRecordDocument>("ApprovalRecord", approvalRecordSchema);
