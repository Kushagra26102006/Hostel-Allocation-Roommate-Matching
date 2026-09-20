import type { Types } from "mongoose";
import { ConsentRecordModel, type ConsentRecordDocument } from "../models/consent-record.model.js";
import { BaseRepository } from "./base.repository.js";

export class ConsentRecordRepository extends BaseRepository<ConsentRecordDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(ConsentRecordModel, institutionId);
  }
}
