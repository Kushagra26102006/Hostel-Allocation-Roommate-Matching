import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export type ApiKeyScope = "occupancy:read" | "allocations:read" | "inventory:read" | "reports:read";

export interface IApiKey {
  name: string;
  key_prefix: string;
  hashed_secret: string;
  scopes: ApiKeyScope[];
  rate_limit: number; // requests per minute
  last_used_at?: Date | undefined;
  revoked: boolean;
  revoked_at?: Date | undefined;
  created_by?: Types.ObjectId | undefined;
}

export interface ApiKeyDocument extends BaseTenantDocument, IApiKey {}

const apiKeySchema = new Schema<ApiKeyDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    key_prefix: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    hashed_secret: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    scopes: {
      type: [String],
      required: true,
      default: ["occupancy:read"],
    },
    rate_limit: {
      type: Number,
      required: true,
      default: 60,
      min: 1,
      max: 1000,
    },
    last_used_at: {
      type: Date,
    },
    revoked: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    revoked_at: {
      type: Date,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

apiKeySchema.plugin(baseSchemaPlugin);

// Unique compound index for tenant + hashed_secret
apiKeySchema.index({ institution_id: 1, hashed_secret: 1 }, { unique: true });
apiKeySchema.index({ institution_id: 1, revoked: 1 });

export const ApiKeyModel =
  (mongoose.models["ApiKey"] as Model<ApiKeyDocument>) ||
  model<ApiKeyDocument>("ApiKey", apiKeySchema);
