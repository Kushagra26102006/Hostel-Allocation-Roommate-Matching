import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type PaymentOrderStatus = "created" | "paid" | "failed" | "refunded";
export type PaymentFeeType =
  "hostel_rent" | "mess_fee" | "caution_deposit" | "full_semester" | "fine_or_damage";

export interface IWebhookEventRecord {
  event_id: string;
  event: string;
  received_at: Date;
}

export interface IPaymentOrder {
  student_id: Types.ObjectId;
  assignment_id?: Types.ObjectId | undefined;
  draft_id?: Types.ObjectId | undefined;
  hostel_id?: Types.ObjectId | undefined;
  order_id: string;
  payment_id?: string | undefined;
  amount_paise: number;
  currency: string;
  fee_type: PaymentFeeType;
  description: string;
  status: PaymentOrderStatus;
  receipt_number: string;
  receipt_s3_key?: string | undefined;
  signature?: string | undefined;
  paid_at?: Date | undefined;
  method?: string | undefined;
  webhook_events: IWebhookEventRecord[];
  policy_flag: "none" | "warning" | "hold";
  notes?: Record<string, string> | undefined;
}

export interface PaymentOrderDocument extends BaseTenantDocument, IPaymentOrder {}

const paymentOrderSchema = new Schema<PaymentOrderDocument>(
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
      index: true,
    },
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
      index: true,
    },
    hostel_id: {
      type: Schema.Types.ObjectId,
      ref: "Hostel",
      index: true,
    },
    order_id: {
      type: String,
      required: true,
      trim: true,
    },
    payment_id: {
      type: String,
      trim: true,
      index: true,
    },
    amount_paise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} must be an integer paise value",
      },
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    fee_type: {
      type: String,
      enum: ["hostel_rent", "mess_fee", "caution_deposit", "full_semester", "fine_or_damage"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },
    receipt_number: {
      type: String,
      required: true,
      trim: true,
    },
    receipt_s3_key: {
      type: String,
      trim: true,
    },
    signature: {
      type: String,
      trim: true,
    },
    paid_at: {
      type: Date,
    },
    method: {
      type: String,
      trim: true,
    },
    webhook_events: [
      {
        event_id: { type: String, required: true },
        event: { type: String, required: true },
        received_at: { type: Date, default: Date.now },
      },
    ],
    policy_flag: {
      type: String,
      enum: ["none", "warning", "hold"],
      default: "none",
      index: true,
    },
    notes: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  },
);

paymentOrderSchema.plugin(baseSchemaPlugin);

// Unique index on order_id per tenant
paymentOrderSchema.index({ institution_id: 1, order_id: 1 }, { unique: true });
// Unique index on receipt_number per tenant
paymentOrderSchema.index({ institution_id: 1, receipt_number: 1 }, { unique: true });
paymentOrderSchema.index({ institution_id: 1, student_id: 1, status: 1 });
paymentOrderSchema.index({ institution_id: 1, "webhook_events.event_id": 1 });

export const PaymentOrderModel =
  (mongoose.models["PaymentOrder"] as Model<PaymentOrderDocument>) ||
  model<PaymentOrderDocument>("PaymentOrder", paymentOrderSchema);
