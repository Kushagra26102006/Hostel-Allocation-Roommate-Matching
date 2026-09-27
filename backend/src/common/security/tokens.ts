import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export interface TokenUserPayload {
  userId: string;
  email: string;
  role: string;
  institutionId: string;
  assignedHostelId?: string | null | undefined;
  isMfaPending?: boolean | undefined;
}

export function signAccessToken(payload: TokenUserPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: {
  userId: string;
  tokenVersion?: number | undefined;
}): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenUserPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenUserPayload;
}

export function verifyRefreshToken(token: string): { userId: string; tokenVersion?: number } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string; tokenVersion?: number };
}
