import crypto from "crypto";
import { Types } from "mongoose";
import { ApiKeyModel, type ApiKeyScope, type IApiKey } from "@hostelhub/db";
import { NotFoundError } from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";

export class AdminService {
  public static async createApiKey(
    institutionId: string,
    data: { name: string; scopes: string[]; expiresAt?: string },
    actor: { userId: string; email: string; role: string },
  ): Promise<{ apiKey: IApiKey; rawKey: string }> {
    const rawKey = `hhk_${crypto.randomBytes(32).toString("hex")}`;
    const hashed_secret = crypto.createHash("sha256").update(rawKey).digest("hex");
    const instId = new Types.ObjectId(institutionId);

    const apiKey = await ApiKeyModel.create({
      institution_id: instId,
      name: data.name,
      hashed_secret,
      key_prefix: rawKey.substring(0, 8),
      scopes: (data.scopes as ApiKeyScope[]) || ["occupancy:read"],
      rate_limit: 60,
      revoked: false,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "admin.create_api_key",
      target: { resourceType: "ApiKey", resourceId: apiKey._id.toString() },
      after: { name: data.name, scopes: data.scopes },
    });

    return { apiKey, rawKey };
  }

  public static async listApiKeys(institutionId: string): Promise<IApiKey[]> {
    return ApiKeyModel.find({ institution_id: new Types.ObjectId(institutionId) })
      .select("-hashed_secret")
      .lean();
  }

  public static async deleteApiKey(
    institutionId: string,
    keyId: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<{ success: boolean }> {
    const key = await ApiKeyModel.findOneAndDelete({
      _id: new Types.ObjectId(keyId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!key) throw new NotFoundError("API Key not found", "KEY_NOT_FOUND");

    await AuditService.record({
      institutionId,
      actor,
      action: "admin.delete_api_key",
      target: { resourceType: "ApiKey", resourceId: keyId },
    });

    return { success: true };
  }
}
