import type { ClientSession, Types, AnyBulkWriteOperation } from "mongoose";
import { BedModel, type BedDocument, type BedStatus } from "../models/bed.model.js";
import { BaseRepository } from "./base.repository.js";

export class BedRepository extends BaseRepository<BedDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(BedModel, institutionId);
  }

  public async findByRoom(
    roomId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<BedDocument[]> {
    return this.find({ room_id: roomId }, undefined, session);
  }

  public async findByRoomAndBedNo(
    roomId: string | Types.ObjectId,
    bedNo: string,
    session?: ClientSession,
  ): Promise<BedDocument | null> {
    return this.findOne(
      {
        room_id: roomId,
        bed_no: bedNo.trim(),
      },
      undefined,
      session,
    );
  }

  public async updateStatusOrAttributes(
    bedId: string | Types.ObjectId,
    currentVersion: number,
    update: { status?: BedStatus; attributes?: Record<string, unknown> },
    session?: ClientSession,
  ): Promise<BedDocument> {
    return this.updateWithVersion(bedId, currentVersion, update, session);
  }

  public async bulkWrite(
    ops: AnyBulkWriteOperation<BedDocument>[],
    session?: ClientSession,
  ): Promise<unknown> {
    return this.model.bulkWrite(ops, session ? { session } : {});
  }
}
