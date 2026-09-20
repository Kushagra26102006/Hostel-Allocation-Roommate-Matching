import type { Types } from "mongoose";
import {
  CompatibilityResponseModel,
  type CompatibilityResponseDocument,
} from "../models/compatibility-response.model.js";
import { BaseRepository } from "./base.repository.js";

export class CompatibilityResponseRepository extends BaseRepository<CompatibilityResponseDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(CompatibilityResponseModel, institutionId);
  }
}
