import type { ClientSession, Types } from "mongoose";
import { ApiKeyModel, type ApiKeyDocument } from "../models/api-key.model.js";
import { BaseRepository } from "./base.repository.js";

export class ApiKeyRepository extends BaseRepository<ApiKeyDocument> {
  constructor(institutionId?: string | Types.ObjectId | null) {
    super(ApiKeyModel, institutionId);
  }

  public async findByHashedSecret(
    hashedSecret: string,
    session?: ClientSession,
  ): Promise<ApiKeyDocument | null> {
    return this.findOne(
      {
        hashed_secret: hashedSecret,
      },
      undefined,
      session ? { session } : undefined,
    );
  }

  public async findByPrefix(
    prefix: string,
    session?: ClientSession,
  ): Promise<ApiKeyDocument | null> {
    return this.findOne(
      {
        key_prefix: prefix,
      },
      undefined,
      session ? { session } : undefined,
    );
  }

  public async listActive(session?: ClientSession): Promise<ApiKeyDocument[]> {
    return this.find(
      {
        revoked: false,
      },
      undefined,
      session ? { session } : undefined,
    );
  }

  public async recordUsage(
    id: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<ApiKeyDocument | null> {
    return this.update(
      id,
      {
        $set: { last_used_at: new Date() },
      },
      session,
    );
  }

  public async revoke(
    id: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<ApiKeyDocument | null> {
    return this.update(
      id,
      {
        $set: {
          revoked: true,
          revoked_at: new Date(),
        },
      },
      session,
    );
  }
}
