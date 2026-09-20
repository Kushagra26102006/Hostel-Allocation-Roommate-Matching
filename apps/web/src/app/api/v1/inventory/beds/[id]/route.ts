import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { BedRepository, AuditService } from "@hostelhub/db";
import { requireIfMatch, formatETag } from "@/lib/api/etag.js";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string().min(1, "Bed ID is required"),
});

const patchBedSchema = z.object({
  status: z.enum(["available", "held", "out_of_service", "occupied"]).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const PATCH = apiHandler(
  {
    permission: "inventory:manage",
    params: paramsSchema,
    body: patchBedSchema,
    operationId: "updateBed",
    summary: "Update Bed Status or Attributes",
  },
  async ({ req, user, institution_id, params, body, setHeader }) => {
    const repo = new BedRepository(institution_id);

    // 1. Fetch current bed
    const bed = await repo.findById(params.id);
    if (!bed) {
      throw new ApiProblemError({
        type: "https://hostelhub.campus.edu/probs/not-found",
        title: "Bed Not Found",
        status: 404,
        detail: `Bed with ID ${params.id} does not exist.`,
        code: "NOT_FOUND",
      });
    }

    // 2. Validate optimistic concurrency (If-Match)
    requireIfMatch(req, bed.version);

    // 3. Perform atomic update with version checking
    const updateData: { status?: "available" | "held" | "out_of_service" | "occupied"; attributes?: Record<string, unknown> } = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.attributes !== undefined) updateData.attributes = body.attributes;

    const updatedBed = await repo.updateStatusOrAttributes(
      params.id,
      bed.version,
      updateData,
    );

    // 4. Emit append-only cryptographic audit entry
    const ip = req.headers.get("x-forwarded-for");
    await AuditService.withTenant(institution_id).append({
      actor: user
        ? { id: user.id, email: user.email, role: user.roles[0] ?? "staff" }
        : "system",
      action: "INVENTORY_BED_UPDATED",
      target: {
        bedId: params.id,
        roomId: bed.room_id.toString(),
        bedNo: bed.bed_no,
      },
      before: {
        status: bed.status,
        attributes: bed.attributes,
        version: bed.version,
      },
      after: {
        status: updatedBed.status,
        attributes: updatedBed.attributes,
        version: updatedBed.version,
      },
      ...(ip ? { ip } : {}),
    });

    // 5. Send updated ETag
    setHeader("ETag", formatETag(updatedBed.version));

    return updatedBed;
  },
);
