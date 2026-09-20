import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApplicationDocumentRepository, ApplicationDocumentModel, AuditService, EntityNotFoundError } from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string(),
});

const verifyDocSchema = z.object({
  status: z.enum(["verified", "rejected"]),
  rejection_reason: z.string().optional(),
});

export const PATCH = apiHandler(
  {
    permission: "document:verify",
    params: paramsSchema,
    body: verifyDocSchema,
    operationId: "verifyDocument",
    summary: "Verify or reject an application document (audited)",
  },
  async ({ user, institution_id, params, body }) => {
    const repo = new ApplicationDocumentRepository(institution_id);
    const doc = await repo.findById(params.id);
    if (!doc) {
      throw new EntityNotFoundError(params.id, "ApplicationDocument");
    }

    const verificationPayload = {
      status: body.status,
      rejection_reason: body.status === "rejected" ? body.rejection_reason ?? "Rejected by admin" : undefined,
      verified_by: {
        user_id: user?.id ?? "staff",
        email: user?.email ?? "staff@campus.edu",
        at: new Date(),
      },
    };

    const updated = await ApplicationDocumentModel.findOneAndUpdate(
      { _id: params.id, institution_id },
      { $set: verificationPayload },
      { new: true, runValidators: true },
    );

    // Write tamper-evident hash chain audit entry
    await AuditService.append({
      institution_id,
      actor: {
        userId: user?.id ?? "staff",
        email: user?.email ?? "staff@campus.edu",
        role: user?.roles[0] ?? "hostel_admin",
      },
      action: `document:${body.status}`,
      target: {
        type: "ApplicationDocument",
        id: params.id,
      },
      before: { status: doc.status },
      after: {
        status: body.status,
        rejection_reason: body.status === "rejected" ? body.rejection_reason ?? "Rejected by admin" : null,
      },
    });

    return updated;
  },
);
