import mongoose, { Schema, model, type Document, type Model, type Types } from "mongoose";

export interface IAuditEntry {
  institution_id: Types.ObjectId;
  sequence: number;
  actor: Record<string, unknown> | string;
  action: string;
  target?: Record<string, unknown> | string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
  timestamp: Date;
  prev_hash: string;
  hash: string;
}

export interface AuditEntryDocument extends Document, IAuditEntry {}

export class ImmutableAuditError extends Error {
  constructor(operation: string) {
    super(`AuditEntry is immutable and append-only: "${operation}" is strictly prohibited.`);
    this.name = "ImmutableAuditError";
    Object.setPrototypeOf(this, ImmutableAuditError.prototype);
  }
}

const auditEntrySchema = new Schema<AuditEntryDocument>(
  {
    institution_id: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    sequence: {
      type: Number,
      required: true,
    },
    actor: {
      type: Schema.Types.Mixed,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    target: {
      type: Schema.Types.Mixed,
    },
    before: {
      type: Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ip: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    prev_hash: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

// Compound index guaranteeing sequence uniqueness per institution
auditEntrySchema.index({ institution_id: 1, sequence: 1 }, { unique: true });

// Prevent updates and deletions via middleware hooks
const blockedOperations = [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "findOneAndReplace",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const;

for (const op of blockedOperations) {
  auditEntrySchema.pre(op, function () {
    const options =
      (this as unknown as { getOptions?: () => Record<string, unknown> }).getOptions?.() ?? {};
    if (options["__allowTamperingForTesting"]) {
      return;
    }
    throw new ImmutableAuditError(op);
  });
}

// Block document-level delete
auditEntrySchema.pre("deleteOne", { document: true, query: false }, function () {
  const options =
    (this as unknown as { $__?: { options?: Record<string, unknown> } }).$__?.options ?? {};
  if (options["__allowTamperingForTesting"]) {
    return;
  }
  throw new ImmutableAuditError("document.deleteOne");
});

export const AuditEntryModel: Model<AuditEntryDocument> =
  (mongoose.models?.["AuditEntry"] as Model<AuditEntryDocument>) ||
  model<AuditEntryDocument>("AuditEntry", auditEntrySchema);
