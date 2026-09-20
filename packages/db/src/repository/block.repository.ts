import type { ClientSession, Types } from "mongoose";
import { BlockModel, type BlockDocument } from "../models/block.model.js";
import { BaseRepository } from "./base.repository.js";

export class BlockRepository extends BaseRepository<BlockDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(BlockModel, institutionId);
  }

  public async findByHostel(
    hostelId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<BlockDocument[]> {
    return this.find({ hostel_id: hostelId }, undefined, session);
  }

  public async findByNameAndFloor(
    hostelId: string | Types.ObjectId,
    name: string,
    floorNo: number,
    session?: ClientSession,
  ): Promise<BlockDocument | null> {
    return this.findOne(
      {
        hostel_id: hostelId,
        name: name.trim(),
        floor_no: floorNo,
      },
      undefined,
      session,
    );
  }
}
