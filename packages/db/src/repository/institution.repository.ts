import type { ClientSession, Types } from "mongoose";
import {
  InstitutionModel,
  type IInstitution,
  type InstitutionDocument,
} from "../models/institution.model.js";

export class InstitutionRepository {
  public async findByCode(
    code: string,
    session?: ClientSession,
  ): Promise<InstitutionDocument | null> {
    let query = InstitutionModel.findOne({
      code: code.toUpperCase().trim(),
    });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  public async findById(
    id: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<InstitutionDocument | null> {
    let query = InstitutionModel.findById(id);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  public async create(
    data: Partial<IInstitution>,
    session?: ClientSession,
  ): Promise<InstitutionDocument> {
    if (session) {
      const [created] = await InstitutionModel.create([data], { session });
      if (!created) {
        throw new Error("Failed to create institution.");
      }
      return created;
    }
    return InstitutionModel.create(data);
  }

  public async findAll(session?: ClientSession): Promise<InstitutionDocument[]> {
    let query = InstitutionModel.find();
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  }
}
