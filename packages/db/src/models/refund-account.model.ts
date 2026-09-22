import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";
import type { EncryptedPayload } from "@hostelhub/shared";

export interface IRefundAccount {
  student_id: Types.ObjectId;
  encrypted_account: EncryptedPayload;
  account_number_last4: string;
  account_holder_name: string;
  ifsc_code: string;
  bank_name: string;
  branch_name: string;
  verified: boolean;
  notes?: string | undefined;
}

export interface RefundAccountDocument extends BaseTenantDocument, IRefundAccount {}

const refundAccountSchema = new Schema<RefundAccountDocument>(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    encrypted_account: {
      keyId: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
      ciphertext: { type: String, required: true },
    },
    account_number_last4: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 4,
    },
    account_holder_name: {
      type: String,
      required: true,
      trim: true,
    },
    ifsc_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 11,
      maxlength: 11,
    },
    bank_name: {
      type: String,
      required: true,
      trim: true,
    },
    branch_name: {
      type: String,
      required: true,
      trim: true,
    },
    verified: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

refundAccountSchema.plugin(baseSchemaPlugin);

// One active refund account per student per tenant
refundAccountSchema.index({ institution_id: 1, student_id: 1 }, { unique: true });

export const RefundAccountModel =
  (mongoose.models["RefundAccount"] as Model<RefundAccountDocument>) ||
  model<RefundAccountDocument>("RefundAccount", refundAccountSchema);
