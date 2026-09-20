import type { ClientSession, Types } from "mongoose";
import { HostelModel, type HostelDocument } from "../models/hostel.model.js";
import { BaseRepository } from "./base.repository.js";

export class HostelRepository extends BaseRepository<HostelDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(HostelModel, institutionId);
  }

  public async findByName(name: string, session?: ClientSession): Promise<HostelDocument | null> {
    return this.findOne({ name: name.trim() }, undefined, session);
  }
}
