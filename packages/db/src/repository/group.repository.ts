import { Types, type ClientSession, type FilterQuery } from "mongoose";
import {
  GroupModel,
  type GroupDocument,
} from "../models/group.model.js";
import { BaseRepository } from "./base.repository.js";

export class GroupRepository extends BaseRepository<GroupDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(GroupModel, institutionId);
  }

  public async findByInviteCode(
    inviteCode: string,
    session?: ClientSession,
  ): Promise<GroupDocument | null> {
    const filter: FilterQuery<GroupDocument> = {
      invite_code: inviteCode.toUpperCase().trim(),
    };
    filter["institution_id"] = this.getInstitutionId();

    let query = this.model.findOne(filter);
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as GroupDocument | null;
  }

  public async findByStudentInCycle(
    studentId: string | Types.ObjectId,
    cycleId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<GroupDocument | null> {
    const studentObjId = typeof studentId === "string" ? new Types.ObjectId(studentId) : studentId;
    const cycleObjId = typeof cycleId === "string" ? new Types.ObjectId(cycleId) : cycleId;

    const filter: FilterQuery<GroupDocument> = {
      cycle_id: cycleObjId,
      "members.student_id": studentObjId,
      status: { $ne: "disbanded" },
      institution_id: this.getInstitutionId(),
    };

    let query = this.model.findOne(filter);
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as GroupDocument | null;
  }
}
