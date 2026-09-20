import { Types, type ClientSession, type FilterQuery } from "mongoose";
import { PolicyRuleSetModel, type PolicyRuleSetDocument } from "../models/policy-ruleset.model.js";
import { BaseRepository } from "./base.repository.js";

export class PolicyRuleSetRepository extends BaseRepository<PolicyRuleSetDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(PolicyRuleSetModel, institutionId);
  }

  public async findLatestActive(session?: ClientSession): Promise<PolicyRuleSetDocument | null> {
    const filter: FilterQuery<PolicyRuleSetDocument> = {
      institution_id: this.getInstitutionId(),
    };

    let query = this.model.findOne(filter).sort({ version: -1 });
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as PolicyRuleSetDocument | null;
  }

  public async lockRuleSet(
    id: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<PolicyRuleSetDocument | null> {
    const objectId = typeof id === "string" ? new Types.ObjectId(id) : id;
    const filter: FilterQuery<PolicyRuleSetDocument> = {
      _id: objectId,
      institution_id: this.getInstitutionId(),
    };

    let query = this.model.findOneAndUpdate(filter, { $set: { is_locked: true } }, { new: true });
    if (session) query = query.session(session);
    const result = await query.exec();
    return result as PolicyRuleSetDocument | null;
  }
}
