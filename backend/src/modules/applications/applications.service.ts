import { Types } from "mongoose";
import crypto from "crypto";
import {
  ApplicationModel,
  ApplicationDocumentModel,
  PreferenceModel,
  CompatibilityResponseModel,
  ConsentRecordModel,
  AllocationCycleModel,
  type ApplicationStatus,
  type IApplication,
  type ApplicationDocument,
  type IApplicationDocument,
  type ApplicationDocumentDocument,
  type IPreference,
  type PreferenceDocument,
  type ConsentRecordDocument,
} from "@hostelhub/db";
import { NotFoundError, ConflictError, BadRequestError } from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";
import { encryptPayload, decryptPayload } from "../../common/security/encryption.js";
import { paginateArray, type PaginatedResult } from "../../common/pagination/index.js";
import { eventBus } from "../../events/domain-events.js";

export type ApplicationWithDetails = IApplication & {
  _id: Types.ObjectId;
  documents: Array<IApplicationDocument & { _id: Types.ObjectId }>;
  preferences: Array<IPreference & { _id: Types.ObjectId }>;
};

export class ApplicationsService {
  public static async listApplications(
    institutionId: string,
    cycleId: string,
    query: { status?: string | undefined; limit?: number | undefined; cursor?: string | undefined },
  ): Promise<PaginatedResult<IApplication & { _id: Types.ObjectId }>> {
    const filter: Record<string, unknown> = {
      institution_id: new Types.ObjectId(institutionId),
      cycle_id: new Types.ObjectId(cycleId),
    };
    if (query.status) filter.status = query.status.toLowerCase();

    const apps = await ApplicationModel.find(filter)
      .sort({ createdAt: -1 })
      .lean<Array<IApplication & { _id: Types.ObjectId }>>();
    return paginateArray(apps, query.limit ?? 50, query.cursor);
  }

  public static async getApplicationById(
    institutionId: string,
    applicationId: string,
  ): Promise<ApplicationWithDetails> {
    const app = await ApplicationModel.findOne({
      _id: new Types.ObjectId(applicationId),
      institution_id: new Types.ObjectId(institutionId),
    }).lean<IApplication & { _id: Types.ObjectId }>();
    if (!app) {
      throw new NotFoundError("Application not found", "APPLICATION_NOT_FOUND");
    }

    const [documents, preferences] = await Promise.all([
      ApplicationDocumentModel.find({ application_id: app._id }).lean<
        Array<IApplicationDocument & { _id: Types.ObjectId }>
      >(),
      PreferenceModel.find({ application_id: app._id })
        .sort({ rank: 1 })
        .lean<Array<IPreference & { _id: Types.ObjectId }>>(),
    ]);

    return {
      ...app,
      documents,
      preferences,
    };
  }

  public static async getStudentActiveApplication(
    institutionId: string,
    studentId: string,
  ): Promise<ApplicationWithDetails | null> {
    const app = await ApplicationModel.findOne({
      institution_id: new Types.ObjectId(institutionId),
      student_id: new Types.ObjectId(studentId),
    })
      .sort({ createdAt: -1 })
      .lean<IApplication & { _id: Types.ObjectId }>();
    if (!app) return null;

    const [documents, preferences] = await Promise.all([
      ApplicationDocumentModel.find({ application_id: app._id }).lean<
        Array<IApplicationDocument & { _id: Types.ObjectId }>
      >(),
      PreferenceModel.find({ application_id: app._id })
        .sort({ rank: 1 })
        .lean<Array<IPreference & { _id: Types.ObjectId }>>(),
    ]);

    return {
      ...app,
      documents,
      preferences,
    };
  }

  public static async createApplication(
    institutionId: string,
    cycleId: string,
    studentId: string,
    snapshot: {
      gender: string;
      academicYear: number;
      gpa?: number;
      homeDistanceKm?: number;
      disability?: boolean;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<ApplicationDocument> {
    const instId = new Types.ObjectId(institutionId);
    const cycleObjectId = new Types.ObjectId(cycleId);
    const studentObjectId = new Types.ObjectId(studentId);

    const cycle = await AllocationCycleModel.findOne({
      _id: cycleObjectId,
      institution_id: instId,
    });
    if (!cycle) {
      throw new NotFoundError("Allocation cycle not found", "CYCLE_NOT_FOUND");
    }
    if (cycle.status !== "open") {
      throw new BadRequestError(
        `Applications are not currently open for cycle status '${cycle.status}'`,
        "CYCLE_NOT_OPEN",
      );
    }

    const existing = await ApplicationModel.findOne({
      cycle_id: cycleObjectId,
      student_id: studentObjectId,
    });
    if (existing) {
      throw new ConflictError(
        "Student has already submitted an application for this cycle",
        "DUPLICATE_APPLICATION",
      );
    }

    const referenceNumber = `APP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const app = await ApplicationModel.create({
      institution_id: instId,
      cycle_id: cycleObjectId,
      student_id: studentObjectId,
      reference_number: referenceNumber,
      status: "draft",
      eligibility_result: { eligible: true, reasons: [] },
      priority_tier: snapshot.disability ? "tier_1_pwd" : "tier_3_regular",
      form_data: {
        gender: snapshot.gender,
        year: snapshot.academicYear,
        cgpa: snapshot.gpa ?? 8.0,
        homeDistanceKm: snapshot.homeDistanceKm ?? 50,
        accessibilityNeed: snapshot.disability ?? false,
      },
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "applications.create",
      target: { resourceType: "Application", resourceId: app._id.toString() },
      after: { cycleId, studentId, status: app.status },
    });

    return app;
  }

  public static async updateApplication(
    institutionId: string,
    applicationId: string,
    data: { status?: string; applicantSnapshot?: Record<string, unknown> },
    actor: { userId: string; email: string; role: string },
  ): Promise<ApplicationDocument> {
    const app = await ApplicationModel.findOne({
      _id: new Types.ObjectId(applicationId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!app) {
      throw new NotFoundError("Application not found", "APPLICATION_NOT_FOUND");
    }

    if (data.status) {
      app.status = data.status.toLowerCase() as ApplicationStatus;
      if (app.status === "submitted") {
        app.submitted_at = new Date();
        eventBus.publish({
          type: "application.submitted",
          institutionId,
          timestamp: new Date(),
          payload: {
            applicationId: app._id.toString(),
            studentId: app.student_id.toString(),
            cycleId: app.cycle_id.toString(),
          },
          actor,
        });
      }
    }
    if (data.applicantSnapshot) {
      app.form_data = { ...app.form_data, ...data.applicantSnapshot };
    }

    await app.save();

    await AuditService.record({
      institutionId,
      actor,
      action: "applications.update",
      target: { resourceType: "Application", resourceId: app._id.toString() },
      after: { status: app.status },
    });

    return app;
  }

  public static async uploadDocument(
    institutionId: string,
    applicationId: string,
    documentType: string,
    fileUrl: string,
    fileName: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<ApplicationDocumentDocument> {
    const app = await ApplicationModel.findOne({
      _id: new Types.ObjectId(applicationId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!app) throw new NotFoundError("Application not found", "APPLICATION_NOT_FOUND");

    const doc = await ApplicationDocumentModel.create({
      institution_id: new Types.ObjectId(institutionId),
      application_id: app._id,
      student_id: app.student_id,
      document_type: documentType,
      s3_key: fileUrl,
      file_name: fileName,
      file_size_bytes: 1024,
      mime_type: "application/pdf",
      sha256_checksum: crypto.createHash("sha256").update(fileUrl).digest("hex"),
      status: "pending",
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "applications.upload_document",
      target: { resourceType: "ApplicationDocument", resourceId: doc._id.toString() },
      after: { documentType, fileName },
    });

    return doc;
  }

  public static async verifyDocument(
    institutionId: string,
    applicationId: string,
    documentId: string,
    status: "VERIFIED" | "REJECTED",
    notes: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<ApplicationDocumentDocument> {
    const doc = await ApplicationDocumentModel.findOne({
      _id: new Types.ObjectId(documentId),
      application_id: new Types.ObjectId(applicationId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!doc) throw new NotFoundError("Document not found", "DOCUMENT_NOT_FOUND");

    doc.status = status === "VERIFIED" ? "verified" : "rejected";
    doc.verified_by = {
      user_id: actor.userId,
      email: actor.email,
      at: new Date(),
    };
    doc.rejection_reason = status === "REJECTED" ? notes : undefined;
    await doc.save();

    await AuditService.record({
      institutionId,
      actor,
      action: "applications.verify_document",
      target: { resourceType: "ApplicationDocument", resourceId: doc._id.toString() },
      after: { verificationStatus: status, notes },
    });

    return doc;
  }

  public static async setPreferences(
    institutionId: string,
    applicationId: string,
    preferences: Array<{ hostelId: string; roomTypePreference?: string }>,
    actor: { userId: string; email: string; role: string },
  ): Promise<PreferenceDocument[]> {
    const app = await ApplicationModel.findOne({
      _id: new Types.ObjectId(applicationId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!app) throw new NotFoundError("Application not found", "APPLICATION_NOT_FOUND");

    // Remove old preferences
    await PreferenceModel.deleteMany({ application_id: app._id });

    const prefDocs: PreferenceDocument[] = [];
    for (let idx = 0; idx < preferences.length; idx++) {
      const p = preferences[idx]!;
      const created = await PreferenceModel.create({
        institution_id: new Types.ObjectId(institutionId),
        application_id: app._id,
        student_id: app.student_id,
        rank: idx + 1,
        hostel_id: new Types.ObjectId(p.hostelId),
        room_type: p.roomTypePreference || "double",
      });
      prefDocs.push(created);
    }

    await AuditService.record({
      institutionId,
      actor,
      action: "preferences.set",
      target: { resourceType: "Preference", resourceId: app._id.toString() },
      after: { count: preferences.length },
    });

    return prefDocs;
  }

  public static async evaluateEligibility(
    institutionId: string,
    applicationId: string,
  ): Promise<{ isEligible: boolean; reasons: string[] }> {
    const app = await ApplicationModel.findOne({
      _id: new Types.ObjectId(applicationId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!app) throw new NotFoundError("Application not found", "APPLICATION_NOT_FOUND");

    const reasons: string[] = [];
    let isEligible = true;

    const cgpa = typeof app.form_data?.cgpa === "number" ? app.form_data.cgpa : 8.0;
    if (cgpa < 5.0) {
      isEligible = false;
      reasons.push("CGPA is below the minimum threshold of 5.0");
    }

    return { isEligible, reasons };
  }

  // Questionnaire (Encrypted AES-256-GCM)
  public static async saveQuestionnaire(
    institutionId: string,
    userId: string,
    answers: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    const encrypted = encryptPayload(answers);
    const instId = new Types.ObjectId(institutionId);
    const userObjectId = new Types.ObjectId(userId);

    await CompatibilityResponseModel.findOneAndUpdate(
      { student_id: userObjectId },
      {
        institution_id: instId,
        student_id: userObjectId,
        key_id: "default-v1",
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        ciphertext: encrypted.encryptedData,
      },
      { upsert: true, new: true },
    );

    return { success: true };
  }

  public static async getQuestionnaire(
    institutionId: string,
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const record = await CompatibilityResponseModel.findOne({
      student_id: new Types.ObjectId(userId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!record || !record.ciphertext) return null;

    try {
      return decryptPayload<Record<string, unknown>>({
        iv: record.iv,
        authTag: record.auth_tag,
        encryptedData: record.ciphertext,
        version: 1,
      });
    } catch {
      return null;
    }
  }

  public static async deleteQuestionnaire(
    institutionId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    await CompatibilityResponseModel.deleteOne({
      student_id: new Types.ObjectId(userId),
      institution_id: new Types.ObjectId(institutionId),
    });
    return { success: true };
  }

  // Consent
  public static async recordConsent(
    institutionId: string,
    userId: string,
    purpose: string,
    granted: boolean,
  ): Promise<ConsentRecordDocument | null> {
    const record = await ConsentRecordModel.findOneAndUpdate(
      { student_id: new Types.ObjectId(userId), consent_type: purpose },
      {
        institution_id: new Types.ObjectId(institutionId),
        student_id: new Types.ObjectId(userId),
        consent_type: purpose,
        status: granted ? "granted" : "withdrawn",
        granted_at: new Date(),
      },
      { upsert: true, new: true },
    );
    return record;
  }

  public static async withdrawConsent(
    institutionId: string,
    userId: string,
    purpose: string,
  ): Promise<ConsentRecordDocument | null> {
    const record = await ConsentRecordModel.findOneAndUpdate(
      { student_id: new Types.ObjectId(userId), consent_type: purpose },
      {
        status: "withdrawn",
        withdrawn_at: new Date(),
      },
      { new: true },
    );
    return record;
  }
}
