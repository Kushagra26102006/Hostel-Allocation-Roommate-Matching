import type { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "./auth.service.js";
import { sendSuccess } from "../../common/utils/response.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const mfaVerifySchema = z.object({
  userId: z.string(),
  token: z.string().min(6).max(8),
});

export const ssoCallbackSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  institutionId: z.string().optional(),
});

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress;

    const result = await AuthService.login(email, password, ip);

    // Set secure httpOnly cookies
    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    if (result.refreshToken) {
      res.cookie("refresh_token", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    sendSuccess(res, result);
  }

  public static async verifyMfa(req: Request, res: Response): Promise<void> {
    const { userId, token } = req.body;
    const ip = req.ip || req.socket.remoteAddress;

    const result = await AuthService.verifyMfa(userId, token, ip);

    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, result);
  }

  public static async refreshToken(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!token) {
      res.status(401).json({
        type: "https://hostelhub.local/errors/unauthorized",
        title: "Unauthorized",
        status: 401,
        code: "REFRESH_TOKEN_MISSING",
        detail: "Refresh token cookie or body property missing.",
      });
      return;
    }

    const result = await AuthService.refreshAccessToken(token);

    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    sendSuccess(res, result);
  }

  public static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    sendSuccess(res, { message: "Logged out successfully" });
  }

  public static async ssoCallback(req: Request, res: Response): Promise<void> {
    const { email, name, institutionId } = req.body;
    const targetInstitution = institutionId || req.institutionId || "inst-default";

    const result = await AuthService.ssoCallback(email, name, targetInstitution);

    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    sendSuccess(res, result);
  }

  public static async getMe(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const user = await AuthService.getCurrentUser(userId);
    sendSuccess(res, user);
  }
}
