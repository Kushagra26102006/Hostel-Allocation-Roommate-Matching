import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, CheckInService } from "@hostelhub/db";
import type { WorkflowRole } from "@hostelhub/domain";

const offlineItemSchema = z.object({
  itemId: z.string().min(1),
  label: z.string().min(1),
  category: z.enum(["furniture", "electrical", "plumbing", "fixtures", "general"]),
  condition: z.enum(["good", "fair", "damaged", "missing"]),
  notes: z.string().optional(),
  photoS3Key: z.string().optional(),
  photoUrl: z.string().optional(),
});

const offlineRecordSchema = z.object({
  clientSyncId: z.string().min(1),
  tokenOrCode: z.string().min(1),
  clientScannedAt: z.string().optional(),
  checklist: z.array(offlineItemSchema),
  notes: z.string().optional(),
});

const syncBatchSchema = z.object({
  records: z.array(offlineRecordSchema).min(1, "At least one offline record is required"),
});

export const POST = apiHandler(
  {
    permission: "checkin:manage",
    body: syncBatchSchema,
    operationId: "syncOfflineCheckIns",
    summary: "Batch sync offline-scanned check-in records when client returns online",
  },
  async ({ user, institution_id, body }) => {
    await connectDb();

    const service = new CheckInService(institution_id);
    const actor = {
      id: user!.id,
      email: user!.email,
      role: (user!.roles[0] || "warden") as WorkflowRole,
      name: user!.name,
    };

    const formattedRecords = body.records.map((r) => ({
      tokenOrCode: r.tokenOrCode,
      clientSyncId: r.clientSyncId,
      clientScannedAt: r.clientScannedAt ? new Date(r.clientScannedAt) : undefined,
      checklist: r.checklist,
      notes: r.notes,
    }));

    const result = await service.syncOfflineCheckIns(formattedRecords, actor);

    return {
      success: true,
      ...result,
    };
  },
);
