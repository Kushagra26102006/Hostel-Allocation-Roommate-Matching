import mongoose, { Schema, model, type Model } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";
import type { PolicyRule } from "@hostelhub/domain";

export interface IPolicyRuleSet {
  name: string;
  version: number;
  is_locked: boolean;
  rules: PolicyRule[];
}

export interface PolicyRuleSetDocument extends BaseTenantDocument, IPolicyRuleSet {}

const policyRuleSchema = new Schema<PolicyRule>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    expression: { type: Schema.Types.Mixed, required: true },
    reasonTemplate: { type: String, required: true },
    policyRef: { type: String, required: true },
    owner: { type: String, default: "hostel_admin" },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date },
    version: { type: Number, default: 1 },
  },
  { _id: false },
);

const policyRuleSetSchema = new Schema<PolicyRuleSetDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
      required: true,
    },
    is_locked: {
      type: Boolean,
      default: false,
    },
    rules: {
      type: [policyRuleSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

policyRuleSetSchema.plugin(baseSchemaPlugin);

policyRuleSetSchema.index({ institution_id: 1, name: 1, version: 1 }, { unique: true });

export const PolicyRuleSetModel: Model<PolicyRuleSetDocument> =
  (mongoose.models?.["PolicyRuleSet"] as Model<PolicyRuleSetDocument>) ||
  model<PolicyRuleSetDocument>("PolicyRuleSet", policyRuleSetSchema);
