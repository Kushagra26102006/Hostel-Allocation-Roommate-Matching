/* eslint-disable no-restricted-imports */
import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import {
  connectDb,
  PromotionProposalModel,
  UserModel,
  BedModel,
  RoomModel,
  HostelModel,
  ApplicationModel,
} from "@hostelhub/db";

const querySchema = z.object({
  draft_id: z.string().optional(),
  status: z.string().optional(),
});

export const GET = apiHandler(
  {
    permission: "hostel:review_own",
    query: querySchema,
    operationId: "getPromotionProposals",
    summary: "List promotion proposals requiring warden approval",
  },
  async ({ query, institution_id }) => {
    await connectDb();

    const filter: Record<string, unknown> = {
      institution_id: new Types.ObjectId(institution_id),
    };

    if (query.draft_id) {
      filter.draft_id = new Types.ObjectId(query.draft_id);
    }

    if (query.status && query.status !== "all") {
      filter.status = query.status;
    } else if (!query.status) {
      filter.status = "pending";
    }

    const proposals = await PromotionProposalModel.find(filter).sort({ createdAt: -1 });

    const studentIds = proposals.map((p) => p.student_id);
    const bedIds = proposals.map((p) => p.bed_id);
    const roomIds = proposals.map((p) => p.room_id);
    const hostelIds = proposals.map((p) => p.hostel_id);
    const appIds = proposals.map((p) => p.application_id);

    const users = await UserModel.find({ _id: { $in: studentIds } });
    const beds = await BedModel.find({ _id: { $in: bedIds } });
    const rooms = await RoomModel.find({ _id: { $in: roomIds } });
    const hostels = await HostelModel.find({ _id: { $in: hostelIds } });
    const apps = await ApplicationModel.find({ _id: { $in: appIds } });

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const bedMap = new Map(beds.map((b) => [b._id.toString(), b]));
    const roomMap = new Map(rooms.map((r) => [r._id.toString(), r]));
    const hostelMap = new Map(hostels.map((h) => [h._id.toString(), h]));
    const appMap = new Map(apps.map((a) => [a._id.toString(), a]));

    const populated = proposals.map((p) => {
      const user = userMap.get(p.student_id.toString());
      const bed = bedMap.get(p.bed_id.toString());
      const room = roomMap.get(p.room_id.toString());
      const hostel = hostelMap.get(p.hostel_id.toString());
      const app = appMap.get(p.application_id.toString());

      const formData = (app?.form_data ?? {}) as Record<string, unknown>;
      const personalInfo = (formData.personal_info ?? {}) as Record<string, string | undefined>;

      return {
        id: p._id.toString(),
        draft_id: p.draft_id.toString(),
        waitlist_entry_id: p.waitlist_entry_id.toString(),
        student_id: p.student_id.toString(),
        student_name:
          user?.name ??
          `${personalInfo.first_name ?? "Student"} ${personalInfo.last_name ?? ""}`.trim(),
        student_email: user?.email ?? personalInfo.email ?? "unknown@hostelhub.internal",
        reference_number: app?.reference_number ?? "APP-REF",
        bed_id: p.bed_id.toString(),
        bed_no: bed?.bed_no ?? "N/A",
        room_id: p.room_id.toString(),
        room_number: room?.room_number ?? "N/A",
        hostel_id: p.hostel_id.toString(),
        hostel_name: hostel?.name ?? "Hostel",
        trigger: p.trigger,
        status: p.status,
        warden_comment: p.warden_comment ?? null,
        rejection_reason: p.rejection_reason ?? null,
        created_by: p.created_by ?? null,
        resolved_by: p.resolved_by ?? null,
        resolved_at: p.resolved_at ?? null,
        created_at: p.createdAt,
      };
    });

    return {
      proposals: populated,
      count: populated.length,
    };
  },
);
