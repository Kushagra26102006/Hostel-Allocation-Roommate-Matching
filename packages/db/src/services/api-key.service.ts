import crypto from "node:crypto";
import type { Types } from "mongoose";
import { ApiKeyRepository } from "../repository/api-key.repository.js";
import type { ApiKeyDocument, ApiKeyScope } from "../models/api-key.model.js";

export interface CreateApiKeyOptions {
  name: string;
  scopes: ApiKeyScope[];
  rate_limit?: number | undefined;
  created_by?: Types.ObjectId | undefined;
}

export interface CreateApiKeyResult {
  plaintextToken: string;
  apiKey: ApiKeyDocument;
}

export interface VerifyApiKeyResult {
  valid: boolean;
  apiKey?: ApiKeyDocument | undefined;
  error?: string | undefined;
  statusCode?: number | undefined;
}

export class ApiKeyService {
  private readonly repo: ApiKeyRepository;

  constructor(private readonly institutionId: string | Types.ObjectId) {
    this.repo = new ApiKeyRepository(this.institutionId);
  }

  /**
   * Generates a new API key.
   * The raw plaintextToken is returned strictly once in this response.
   */
  public async createApiKey(options: CreateApiKeyOptions): Promise<CreateApiKeyResult> {
    const randomHex = crypto.randomBytes(24).toString("hex");
    const plaintextToken = `hh_live_${randomHex}`;
    const keyPrefix = `hh_live_${randomHex.slice(0, 8)}`;
    const hashedSecret = crypto.createHash("sha256").update(plaintextToken).digest("hex");

    const doc = await this.repo.create({
      name: options.name.trim(),
      key_prefix: keyPrefix,
      hashed_secret: hashedSecret,
      scopes: options.scopes,
      rate_limit: options.rate_limit ?? 60,
      revoked: false,
      ...(options.created_by ? { created_by: options.created_by } : {}),
    });

    return {
      plaintextToken,
      apiKey: doc,
    };
  }

  /**
   * Hashes and verifies an incoming Bearer token.
   * Checks existence, revocation, and required scope.
   */
  public async verifyApiKey(
    bearerToken: string,
    requiredScope?: ApiKeyScope,
  ): Promise<VerifyApiKeyResult> {
    const token = bearerToken.trim();
    if (!token) {
      return {
        valid: false,
        error: "Missing API key in Authorization header.",
        statusCode: 401,
      };
    }

    const hashedSecret = crypto.createHash("sha256").update(token).digest("hex");
    const key = await this.repo.findByHashedSecret(hashedSecret);

    if (!key) {
      return {
        valid: false,
        error: "Invalid API key.",
        statusCode: 401,
      };
    }

    if (key.revoked) {
      return {
        valid: false,
        error: "API key has been revoked.",
        statusCode: 401,
      };
    }

    if (requiredScope && !key.scopes.includes(requiredScope)) {
      return {
        valid: false,
        error: `API key lacks required scope: "${requiredScope}". Allowed scopes: [${key.scopes.join(", ")}].`,
        statusCode: 403,
      };
    }

    // Update last_used_at asynchronously
    await this.repo.recordUsage(key._id);

    return {
      valid: true,
      apiKey: key,
    };
  }

  /**
   * Revokes an existing API key.
   */
  public async revokeApiKey(id: string | Types.ObjectId): Promise<ApiKeyDocument | null> {
    return this.repo.revoke(id);
  }

  /**
   * Lists all API keys for tenant.
   */
  public async listApiKeys(): Promise<ApiKeyDocument[]> {
    return this.repo.find({}, undefined, { sort: { createdAt: -1 } });
  }
}
