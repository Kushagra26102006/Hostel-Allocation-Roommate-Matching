import { Types, type ClientSession, type FilterQuery } from "mongoose";
import {
  PreferenceModel,
  type PreferenceDocument,
} from "../models/preference.model.js";
import { BaseRepository } from "./base.repository.js";

export class PreferenceRepository extends BaseRepository<PreferenceDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(PreferenceModel, institutionId);
  }

  public async findByApplication(
    applicationId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<PreferenceDocument[]> {
    const filter: FilterQuery<PreferenceDocument> = {
      application_id:
        typeof applicationId === "string"
          ? new Types.ObjectId(applicationId)
          : applicationId,
    };
    filter["institution_id"] = this.getInstitutionId();

    let query = this.model.find(filter).sort({ rank: 1 });
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as PreferenceDocument[];
  }

  /**
   * Transactionally replace all preferences for an application.
   */
  public async replacePreferences(
    applicationId: string | Types.ObjectId,
    studentId: string | Types.ObjectId,
    items: Array<{ hostel_id: string | Types.ObjectId; room_type: string; rank: number; roommate_ids?: Array<string | Types.ObjectId> }>,
    session?: ClientSession,
  ): Promise<PreferenceDocument[]> {
    const appObjId = typeof applicationId === "string" ? new Types.ObjectId(applicationId) : applicationId;
    const studentObjId = typeof studentId === "string" ? new Types.ObjectId(studentId) : studentId;
    const instId = this.getInstitutionId();

    // 1. Delete existing preferences for application
    const filter = {
      institution_id: instId,
      application_id: appObjId,
    };

    if (session) {
      await this.model.deleteMany(filter).session(session);
    } else {
      await this.model.deleteMany(filter);
    }

    // 2. Insert new preferences sorted by rank
    const docsToInsert = items.map((item) => ({
      institution_id: instId,
      application_id: appObjId,
      student_id: studentObjId,
      rank: item.rank,
      hostel_id: typeof item.hostel_id === "string" ? new Types.ObjectId(item.hostel_id) : item.hostel_id,
      room_type: item.room_type,
      roommate_ids: (item.roommate_ids || []).map((id) => (typeof id === "string" ? new Types.ObjectId(id) : id)),
    }));

    if (docsToInsert.length === 0) return [];

    let created: PreferenceDocument[];
    if (session) {
      created = (await this.model.create(docsToInsert, { session })) as unknown as PreferenceDocument[];
    } else {
      created = (await this.model.create(docsToInsert)) as unknown as PreferenceDocument[];
    }

    return created.sort((a, b) => a.rank - b.rank);
  }
}
