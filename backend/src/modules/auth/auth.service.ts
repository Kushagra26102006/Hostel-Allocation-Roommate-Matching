import argon2 from "argon2";
import { Types } from "mongoose";
import { UserModel, type UserDocument } from "@hostelhub/db";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenUserPayload,
} from "../../common/security/tokens.js";
import { verifyTotpToken } from "../../common/security/totp.js";
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";

export interface LoginResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    institutionId: string;
    assignedHostelId?: string | null | undefined;
    mfaRequired: boolean;
  };
  accessToken: string;
  refreshToken?: string | undefined;
  requiresMfa: boolean;
}

export class AuthService {
  public static async login(
    email: string,
    passwordPlain: string,
    ipAddress?: string,
  ): Promise<LoginResult> {
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
      "+passwordHash +mfa.secret",
    );
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    if (user.status !== "active") {
      throw new ForbiddenError("User account is deactivated or suspended", "ACCOUNT_DEACTIVATED");
    }

    const isMatch = await argon2.verify(user.passwordHash, passwordPlain);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const primaryRole = user.roles[0] || "student";
    const isAdminRole = ["sys_admin", "chief_warden", "hostel_admin", "warden", "dean"].includes(
      primaryRole,
    );
    const requiresMfa = isAdminRole && !!user.mfa?.secret && user.mfa?.enabled;

    const tokenPayload: TokenUserPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: primaryRole,
      institutionId: user.institution_id ? user.institution_id.toString() : "inst-default",
      assignedHostelId: user.hostelAssignments?.[0] ?? null,
      isMfaPending: requiresMfa,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = requiresMfa
      ? undefined
      : signRefreshToken({ userId: user._id.toString() });

    await AuditService.record({
      institutionId: user.institution_id ? user.institution_id.toString() : "inst-default",
      actor: { userId: user._id.toString(), email: user.email, role: primaryRole },
      action: "auth.login",
      target: { resourceType: "User", resourceId: user._id.toString() },
      ipAddress,
    });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: primaryRole,
        institutionId: user.institution_id ? user.institution_id.toString() : "inst-default",
        assignedHostelId: user.hostelAssignments?.[0] ?? null,
        mfaRequired: requiresMfa,
      },
      accessToken,
      refreshToken,
      requiresMfa,
    };
  }

  public static async verifyMfa(
    userId: string,
    totpToken: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await UserModel.findById(userId).select("+mfa.secret");
    if (!user || !user.mfa?.secret) {
      throw new BadRequestError("MFA is not configured for this user", "MFA_NOT_CONFIGURED");
    }

    const isValid = verifyTotpToken(totpToken, user.mfa.secret);
    if (!isValid) {
      throw new UnauthorizedError("Invalid TOTP verification code", "INVALID_MFA_CODE");
    }

    const primaryRole = user.roles[0] || "student";
    const tokenPayload: TokenUserPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: primaryRole,
      institutionId: user.institution_id ? user.institution_id.toString() : "inst-default",
      assignedHostelId: user.hostelAssignments?.[0] ?? null,
      isMfaPending: false,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    await AuditService.record({
      institutionId: user.institution_id ? user.institution_id.toString() : "inst-default",
      actor: { userId: user._id.toString(), email: user.email, role: primaryRole },
      action: "auth.mfa_verify",
      target: { resourceType: "User", resourceId: user._id.toString() },
      ipAddress,
    });

    return { accessToken, refreshToken };
  }

  public static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await UserModel.findById(decoded.userId);
    if (!user || user.status !== "active") {
      throw new UnauthorizedError("User session expired or invalidated", "INVALID_SESSION");
    }

    const primaryRole = user.roles[0] || "student";
    const tokenPayload: TokenUserPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: primaryRole,
      institutionId: user.institution_id ? user.institution_id.toString() : "inst-default",
      assignedHostelId: user.hostelAssignments?.[0] ?? null,
      isMfaPending: false,
    };

    const accessToken = signAccessToken(tokenPayload);
    return { accessToken };
  }

  public static async ssoCallback(
    email: string,
    name: string,
    institutionId: string,
  ): Promise<LoginResult> {
    let user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await UserModel.create({
        institution_id: new Types.ObjectId(institutionId),
        email: email.toLowerCase(),
        name,
        roles: ["student"],
        status: "active",
        mfa: { enabled: false },
      });
    }

    const primaryRole = user.roles[0] || "student";
    const tokenPayload: TokenUserPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: primaryRole,
      institutionId: user.institution_id ? user.institution_id.toString() : institutionId,
      assignedHostelId: user.hostelAssignments?.[0] ?? null,
      isMfaPending: false,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: primaryRole,
        institutionId: user.institution_id ? user.institution_id.toString() : institutionId,
        assignedHostelId: user.hostelAssignments?.[0] ?? null,
        mfaRequired: false,
      },
      accessToken,
      refreshToken,
      requiresMfa: false,
    };
  }

  public static async getCurrentUser(userId: string): Promise<UserDocument> {
    const user = await UserModel.findById(userId).select(
      "-passwordHash -mfa.secret -mfa.backupCodes",
    );
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }
    return user;
  }
}
