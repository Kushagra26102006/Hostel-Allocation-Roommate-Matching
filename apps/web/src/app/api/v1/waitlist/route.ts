/* eslint-disable no-restricted-imports */
import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import {
  connectDb,
  WaitlistEntryModel,
  AllocationDraftModel,
  AllocationCycleModel,
  ApplicationModel,
  UserModel,
  PromotionProposalModel,
} from "@hostelhub/db";

const querySchema = z.object({
  draft_id: z.string().optional(),
  status: z.string().optional(),
  quota_bucket: z.string().optional(),
  search: z.string().optional(),
});

export const GET = apiHandler(
  {
    permission: "hostel:review_own",
    query: querySchema,
    operationId: "getWaitlistEntries",
    summary: "Retrieve ordered waiting list entries with position badges and reason codes",
  },
  async ({ query, institution_id }) => {
    await connectDb();

    let draftId = query.draft_id;
    let cyclePromotionPolicy: "auto_confirm" | "proposal_required" = "auto_confirm";

    if (!draftId) {
      // Pick latest draft
      const latestDraft = await AllocationDraftModel.findOne({
        institution_id: new Types.ObjectId(institution_id),
      }).sort({ createdAt: -1 });

      if (!latestDraft) {
        return {
          draft_id: null,
          cycle_policy: "auto_confirm",
          entries: [],
          total: 0,
          pending_proposals_count: 0,
        };
      }
      draftId = latestDraft._id.toString();
    }

    const draft = await AllocationDraftModel.findById(draftId);
    if (draft) {
      const cycle = await AllocationCycleModel.findById(draft.cycle_id);
      if (cycle?.promotion_policy) {
        cyclePromotionPolicy = cycle.promotion_policy as "auto_confirm" | "proposal_required";
      }
    }

    const filter: Record<string, unknown> = {
      institution_id: new Types.ObjectId(institution_id),
      draft_id: new Types.ObjectId(draftId),
    };

    if (query.status && query.status !== "all") {
      filter.status = query.status;
    }

    if (query.quota_bucket && query.quota_bucket !== "all") {
      filter.quota_bucket = query.quota_bucket;
    }

    const entries = await WaitlistEntryModel.find(filter).sort({ position: 1, priority_score: -1 });

    const studentIds = entries.map((e) => e.student_id);
    const appIds = entries.map((e) => e.application_id);

    const users = await UserModel.find({ _id: { $in: studentIds } });
    const apps = await ApplicationModel.find({ _id: { $in: appIds } });

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const appMap = new Map(apps.map((a) => [a._id.toString(), a]));

    const pendingProposalsCount = await PromotionProposalModel.countDocuments({
      draft_id: new Types.ObjectId(draftId),
      status: "pending",
    });

    const populatedEntries = entries.map((e) => {
      const user = userMap.get(e.student_id.toString());
      const app = appMap.get(e.application_id.toString());
      const formData = (app?.form_data ?? {}) as Record<string, unknown>;
      const personalInfo = (formData.personal_info ?? {}) as Record<string, unknown>;
      const academicInfo = (formData.academic_info ?? {}) as Record<string, unknown>;

      const isAccessibility = Boolean(
        personalInfo.accessibility_need ||
        personalInfo.pwd ||
        (Array.isArray(personalInfo.medical_conditions) &&
          personalInfo.medical_conditions.length > 0),
      );

      // Derive human friendly reason if not already recorded
      let waitingReason = e.waiting_reason_code ?? "QUOTA_EXHAUSTED";
      if (!e.waiting_reason_code) {
        if (isAccessibility) {
          waitingReason = "ACCESSIBLE_ROOM_CAPACITY_REACHED";
        } else if (personalInfo.gender === "female") {
          waitingReason = "FEMALE_WING_AT_CAPACITY";
        } else {
          waitingReason = "QUOTA_EXHAUSTED";
        }
      }

      return {
        id: e._id.toString(),
        draft_id: e.draft_id.toString(),
        application_id: e.application_id.toString(),
        student_id: e.student_id.toString(),
        student_name:
          user?.name ??
          `${personalInfo.first_name ?? "Student"} ${personalInfo.last_name ?? ""}`.trim(),
        student_email: user?.email ?? personalInfo.email ?? "unknown@hostelhub.internal",
        reference_number: app?.reference_number ?? `APP-${e.position}`,
        gender: personalInfo.gender ?? "male",
        programme: academicInfo.programme ?? "General",
        year: academicInfo.year ?? 1,
        accessibility_need: isAccessibility,
        position: e.position,
        priority_score: e.priority_score ?? 0,
        quota_bucket: e.quota_bucket,
        status: e.status ?? "waiting",
        waiting_reason_code: waitingReason,
        reorder_history: e.reorder_history ?? [],
        createdAt: e.createdAt,
      };
    });

    // Optional client search filter
    let filtered = populatedEntries;
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = populatedEntries.filter(
        (p) =>
          p.student_name.toLowerCase().includes(q) ||
          p.student_email.toLowerCase().includes(q) ||
          p.reference_number.toLowerCase().includes(q) ||
          p.quota_bucket.toLowerCase().includes(q),
      );
    }

    return {
      draft_id: draftId,
      cycle_policy: cyclePromotionPolicy,
      entries: filtered,
      total: filtered.length,
      pending_proposals_count: pendingProposalsCount,
    };
  },
);
