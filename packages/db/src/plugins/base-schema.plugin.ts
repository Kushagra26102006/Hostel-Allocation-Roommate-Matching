import { Schema, type Document, type Types } from "mongoose";

export interface BaseTenantDocument extends Document {
  institution_id: Types.ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export function baseSchemaPlugin<T extends Document>(
  schema: Schema<T>,
  _options?: Record<string, unknown>,
): void {
  schema.add({
    institution_id: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      required: true,
    },
  } as unknown as Parameters<typeof schema.add>[0]);

  // Enable timestamps if not already configured
  schema.set("timestamps", true);

  // Compound index on institution_id and _id for efficient multi-tenant lookups
  schema.index({ institution_id: 1, _id: 1 });
}
