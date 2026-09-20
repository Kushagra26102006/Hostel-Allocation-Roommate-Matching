import type { ClientSession, Types } from "mongoose";
import { RoomModel, type RoomDocument } from "../models/room.model.js";
import { BaseRepository } from "./base.repository.js";

export class RoomRepository extends BaseRepository<RoomDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(RoomModel, institutionId);
  }

  public async findByBlock(
    blockId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<RoomDocument[]> {
    return this.find({ block_id: blockId }, undefined, session);
  }

  public async findByBlockAndNumber(
    blockId: string | Types.ObjectId,
    roomNumber: string,
    session?: ClientSession,
  ): Promise<RoomDocument | null> {
    return this.findOne(
      {
        block_id: blockId,
        room_number: roomNumber.trim(),
      },
      undefined,
      session,
    );
  }
}
