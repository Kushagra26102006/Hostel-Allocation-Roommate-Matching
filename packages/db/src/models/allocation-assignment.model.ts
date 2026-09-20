import mongoose, { Schema, model, type Model, type Types } from "mongoose";
import { baseSchemaPlugin, type BaseTenantDocument } from "../plugins/base-schema.plugin.js";

export interface IAllocationAssignment {
  draft_id: Types.ObjectId;
  run_id: Types.ObjectId;
  application_id: Types.ObjectId;
  student_id: Types.ObjectId;
  bed_id: Types.ObjectId;
  room_id: Types.ObjectId;
  hostel_id: Types.ObjectId;
  score: number;
  explanation: string;
}

export interface AllocationAssignmentDocument extends BaseTenantDocument, IAllocationAssignment {}

const allocationAssignmentSchema = new Schema<AllocationAssignmentDocument>(
  {
    draft_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationDraft",
      required: true,
      index: true,
    },
    run_id: {
      type: Schema.Types.ObjectId,
      ref: "AllocationRun",
      required: true,
      index: true,
    },
    application_id: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bed_id: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
      index: true,
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
    score: {
      type: Number,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "allocation_assignments",
  },
);

allocationAssignmentSchema.plugin(baseSchemaPlugin);

// Unique indexes as explicitly specified:
// (draft_id, bed_id) and (draft_id, application_id)
allocationAssignmentSchema.index({ draft_id: 1, bed_id: 1 }, { unique: true });
allocationAssignmentSchema.index({ draft_id: 1, application_id: 1 }, { unique: true });

// Helper to check if a draft is published
async function assertDraftNotPublished(
  draftId: Types.ObjectId | string,
  db: mongoose.Connection,
): Promise<void> {
  const draft = await db
    .collection("allocation_drafts")
    .findOne(
      { _id: typeof draftId === "string" ? new mongoose.Types.ObjectId(draftId) : draftId },
      { projection: { status: 1 } },
    );
  if (draft && (draft.status === "PUBLISHED" || draft.status === "published")) {
    throw new Error("Cannot modify or delete assignments of a published draft");
  }
}

// Layer c: Read-only published rows pre-hooks
allocationAssignmentSchema.pre("save", async function (next) {
  try {
    if (!this.isNew && this.isModified()) {
      await assertDraftNotPublished(this.draft_id, this.db || mongoose.connection);
    }
    next();
  } catch (err) {
    next(err as Error);
  }
});

allocationAssignmentSchema.pre(["updateOne", "findOneAndUpdate"], async function (next) {
  try {
    const query = this.getQuery();
    const existing = await this.model
      .findOne(query)
      .select("draft_id")
      .lean<{ draft_id?: Types.ObjectId }>();
    if (existing?.draft_id) {
      await assertDraftNotPublished(existing.draft_id, mongoose.connection);
    }
    next();
  } catch (err) {
    next(err as Error);
  }
});

allocationAssignmentSchema.pre(["deleteOne", "findOneAndDelete"], async function (next) {
  try {
    const query = this.getQuery();
    const existing = await this.model
      .findOne(query)
      .select("draft_id")
      .lean<{ draft_id?: Types.ObjectId }>();
    if (existing?.draft_id) {
      await assertDraftNotPublished(existing.draft_id, mongoose.connection);
    }
    next();
  } catch (err) {
    next(err as Error);
  }
});

export const AllocationAssignmentModel: Model<AllocationAssignmentDocument> =
  (mongoose.models["AllocationAssignment"] as Model<AllocationAssignmentDocument>) ||
  model<AllocationAssignmentDocument>("AllocationAssignment", allocationAssignmentSchema);
