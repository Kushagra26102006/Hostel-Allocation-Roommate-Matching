import type { ClientSession, FilterQuery, Types } from "mongoose";
import {
  AllocationCycleModel,
  type AllocationCycleDocument,
} from "../models/allocation-cycle.model.js";
import { BaseRepository } from "./base.repository.js";

export class AllocationCycleRepository extends BaseRepository<AllocationCycleDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(AllocationCycleModel, institutionId);
  }

  public async findActiveCycle(
    session?: ClientSession,
  ): Promise<AllocationCycleDocument | null> {
    const filter: FilterQuery<AllocationCycleDocument> = {
      status: "open",
      institution_id: this.getInstitutionId(),
    };

    let query = this.model.findOne(filter).sort({ window_close: -1 });
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as AllocationCycleDocument | null;
  }

  public async findByAcademicYear(
    academicYear: string,
    session?: ClientSession,
  ): Promise<AllocationCycleDocument[]> {
    const filter: FilterQuery<AllocationCycleDocument> = {
      academic_year: academicYear,
      institution_id: this.getInstitutionId(),
    };

    let query = this.model.find(filter);
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as AllocationCycleDocument[];
  }
}
