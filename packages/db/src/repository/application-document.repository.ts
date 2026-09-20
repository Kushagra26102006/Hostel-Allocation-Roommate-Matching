import { Types, type ClientSession, type FilterQuery } from "mongoose";
import {
  ApplicationDocumentModel,
  type ApplicationDocumentDocument,
  type DocumentScanStatus,
} from "../models/application-document.model.js";
import { BaseRepository } from "./base.repository.js";

export class ApplicationDocumentRepository extends BaseRepository<ApplicationDocumentDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(ApplicationDocumentModel, institutionId);
  }

  public async findByApplication(
    applicationId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<ApplicationDocumentDocument[]> {
    const filter: FilterQuery<ApplicationDocumentDocument> = {
      application_id:
        typeof applicationId === "string" ? new Types.ObjectId(applicationId) : applicationId,
      institution_id: this.getInstitutionId(),
    };

    let query = this.model.find(filter).sort({ createdAt: -1 });
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as ApplicationDocumentDocument[];
  }

  public async updateVerificationStatus(
    id: string | Types.ObjectId,
    status: DocumentScanStatus,
    verifier: { user_id: string; email: string },
    rejectionReason?: string,
    session?: ClientSession,
  ): Promise<ApplicationDocumentDocument | null> {
    const targetId = typeof id === "string" ? new Types.ObjectId(id) : id;
    const filter: FilterQuery<ApplicationDocumentDocument> = {
      _id: targetId,
      institution_id: this.getInstitutionId(),
    };

    const updatePayload: Record<string, unknown> = {
      $set: {
        status,
        verified_by: {
          user_id: verifier.user_id,
          email: verifier.email,
          at: new Date(),
        },
        ...(rejectionReason !== undefined ? { rejection_reason: rejectionReason } : {}),
      },
      $inc: { version: 1 },
    };

    let query = this.model.findOneAndUpdate(filter, updatePayload, { new: true });
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as ApplicationDocumentDocument | null;
  }
}
