import mongoose, { Schema, model, type Document, type Model, type Types } from "mongoose";

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export interface IAuditChainHead {
  institution_id: Types.ObjectId;
  last_sequence: number;
  last_hash: string;
  updatedAt: Date;
}

export interface AuditChainHeadDocument extends Document, IAuditChainHead {}

const auditChainHeadSchema = new Schema<AuditChainHeadDocument>(
  {
    institution_id: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    last_sequence: {
      type: Number,
      required: true,
      default: 0,
    },
    last_hash: {
      type: String,
      required: true,
      default: GENESIS_HASH,
    },
  },
  {
    timestamps: true,
  },
);

export const AuditChainHeadModel: Model<AuditChainHeadDocument> =
  (mongoose.models?.["AuditChainHead"] as Model<AuditChainHeadDocument>) ||
  model<AuditChainHeadDocument>("AuditChainHead", auditChainHeadSchema);
