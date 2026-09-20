import type { ClientSession, Types } from "mongoose";
import { UserModel, type UserDocument } from "../models/user.model.js";
import { BaseRepository } from "./base.repository.js";

export class UserRepository extends BaseRepository<UserDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(UserModel, institutionId);
  }

  /**
   * Find a user by email within the scoped tenant institution.
   */
  public async findByEmail(
    email: string,
    session?: ClientSession,
  ): Promise<UserDocument | null> {
    let query = this.model
      .findOne({
        email: email.toLowerCase().trim(),
        institution_id: this.getInstitutionId(),
      })
      .select("+passwordHash +mfa.secret +mfa.backupCodes");

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  /**
   * Find a user globally by email across all institutions (used during login/auth).
   * Safely checks for tenant ambiguity; throws if multiple matching accounts are found.
   */
  public static async findByEmailGlobal(
    email: string,
    session?: ClientSession,
  ): Promise<UserDocument | null> {
    let query = UserModel.find({
      email: email.toLowerCase().trim(),
    }).select("+passwordHash +mfa.secret +mfa.backupCodes");

    if (session) {
      query = query.session(session);
    }

    const matches = await query.exec();

    if (matches.length === 0) {
      return null;
    }

    if (matches.length > 1) {
      throw new Error(
        "Ambiguous account lookup: Multiple institution accounts found for this email address. Please log in using institution domain or institution ID.",
      );
    }

    return matches[0]!;
  }
}
