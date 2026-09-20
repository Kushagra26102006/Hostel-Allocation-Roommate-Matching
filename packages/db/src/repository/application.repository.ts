import { Types, type ClientSession, type FilterQuery } from "mongoose";
import {
  ApplicationModel,
  type ApplicationDocument,
} from "../models/application.model.js";
import { BaseRepository } from "./base.repository.js";

export class ApplicationRepository extends BaseRepository<ApplicationDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(ApplicationModel, institutionId);
  }

  public async findByStudentAndCycle(
    studentId: string | Types.ObjectId,
    cycleId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<ApplicationDocument | null> {
    const filter: FilterQuery<ApplicationDocument> = {
      student_id: typeof studentId === "string" ? new Types.ObjectId(studentId) : studentId,
      cycle_id: typeof cycleId === "string" ? new Types.ObjectId(cycleId) : cycleId,
    };
    filter["institution_id"] = this.getInstitutionId();

    let query = this.model.findOne(filter);
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as ApplicationDocument | null;
  }

  public async findByStudent(
    studentId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<ApplicationDocument[]> {
    const filter: FilterQuery<ApplicationDocument> = {
      student_id: typeof studentId === "string" ? new Types.ObjectId(studentId) : studentId,
      institution_id: this.getInstitutionId(),
    };

    let query = this.model.find(filter).sort({ createdAt: -1 });
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as ApplicationDocument[];
  }
}
