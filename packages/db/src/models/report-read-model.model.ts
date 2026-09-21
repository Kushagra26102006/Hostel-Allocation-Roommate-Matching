import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";
import type { ReportType } from "@hostelhub/domain";

export interface IReportReadModel {
  cycle_id: Types.ObjectId;
  academic_year: string;
  report_type: ReportType;
  data: Record<string, unknown>;
  generated_at: Date;
  last_refreshed_at: Date;
}

export interface ReportReadModelDocument extends BaseTenantDocument, IReportReadModel {}

const reportReadModelSchema = new Schema<ReportReadModelDocument>(
  {
    cycle_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationCycle",
      required: true,
      index: true,
    },
    academic_year: {
      type: String,
      required: true,
      index: true,
    },
    report_type: {
      type: String,
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    generated_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    last_refreshed_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "report_read_models",
  },
);

reportReadModelSchema.plugin(baseSchemaPlugin);

// Unique index per tenant, cycle, and report type for ultra-fast < 3s dashboard queries
reportReadModelSchema.index({ institution_id: 1, cycle_id: 1, report_type: 1 }, { unique: true });

export const ReportReadModelModel: Model<ReportReadModelDocument> =
  (mongoose.models["ReportReadModel"] as Model<ReportReadModelDocument>) ||
  model<ReportReadModelDocument>("ReportReadModel", reportReadModelSchema);
