import argon2 from "argon2";
import { Types } from "mongoose";
import { UserModel, type IUser, type UserDocument, type UserRole } from "@hostelhub/db";
import { NotFoundError, ConflictError } from "../../common/errors/app-error.js";
import { generateTotpSecret } from "../../common/security/totp.js";
import { paginateArray, type PaginatedResult } from "../../common/pagination/index.js";
import { AuditService } from "../audit/audit.service.js";

export class UsersService {
  public static async listUsers(
    institutionId: string,
    query: { role?: string | undefined; limit?: number | undefined; cursor?: string | undefined },
  ): Promise<PaginatedResult<IUser>> {
    const filter: Record<string, unknown> = { institution_id: new Types.ObjectId(institutionId) };
    if (query.role) filter.roles = query.role;

    const users = await UserModel.find(filter)
      .select("-passwordHash -mfa.secret -mfa.backupCodes")
      .sort({ createdAt: -1 })
      .lean<IUser[]>();

    return paginateArray<IUser>(users, query.limit ?? 20, query.cursor);
  }

  public static async getUserById(institutionId: string, userId: string): Promise<UserDocument> {
    const user = await UserModel.findOne({
      _id: new Types.ObjectId(userId),
      institution_id: new Types.ObjectId(institutionId),
    }).select("-passwordHash -mfa.secret -mfa.backupCodes");
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }
    return user;
  }

  public static async createUser(
    institutionId: string,
    data: {
      email: string;
      name: string;
      role: string;
      password?: string | undefined;
      assignedHostelId?: string | null | undefined;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<IUser> {
    const existing = await UserModel.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new ConflictError("A user with this email already exists", "USER_EMAIL_EXISTS");
    }

    const passwordHash = data.password ? await argon2.hash(data.password) : undefined;
    const mfaSecret = ["warden", "chief_warden", "hostel_admin", "sys_admin"].includes(data.role)
      ? generateTotpSecret()
      : undefined;

    const user = await UserModel.create({
      institution_id: new Types.ObjectId(institutionId),
      email: data.email.toLowerCase(),
      name: data.name,
      roles: [data.role as UserRole],
      passwordHash,
      mfa: {
        enabled: !!mfaSecret,
        secret: mfaSecret,
        method: "totp",
      },
      hostelAssignments: data.assignedHostelId ? [data.assignedHostelId] : [],
      status: "active",
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "users.create",
      target: { resourceType: "User", resourceId: user._id.toString() },
      after: { email: user.email, role: data.role, name: user.name },
    });

    const doc = user.toObject() as unknown as Record<string, unknown>;
    delete doc.passwordHash;
    if (doc.mfa && typeof doc.mfa === "object") {
      delete (doc.mfa as Record<string, unknown>).secret;
    }
    return doc as unknown as IUser;
  }

  public static async updateUser(
    institutionId: string,
    userId: string,
    data: {
      name?: string | undefined;
      role?: string | undefined;
      isActive?: boolean | undefined;
      assignedHostelId?: string | null | undefined;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<IUser> {
    const user = await UserModel.findOne({
      _id: new Types.ObjectId(userId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    const before = { name: user.name, roles: user.roles, status: user.status };

    if (data.name !== undefined) user.name = data.name;
    if (data.role !== undefined) user.roles = [data.role as UserRole];
    if (data.isActive !== undefined) user.status = data.isActive ? "active" : "suspended";
    if (data.assignedHostelId !== undefined) {
      user.hostelAssignments = data.assignedHostelId ? [data.assignedHostelId] : [];
    }

    await user.save();

    await AuditService.record({
      institutionId,
      actor,
      action: "users.update",
      target: { resourceType: "User", resourceId: user._id.toString() },
      before,
      after: { name: user.name, roles: user.roles, status: user.status },
    });

    const doc = user.toObject() as unknown as Record<string, unknown>;
    delete doc.passwordHash;
    if (doc.mfa && typeof doc.mfa === "object") {
      delete (doc.mfa as Record<string, unknown>).secret;
    }
    return doc as unknown as IUser;
  }
}
