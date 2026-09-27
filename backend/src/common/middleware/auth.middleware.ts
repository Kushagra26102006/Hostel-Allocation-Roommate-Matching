import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../errors/app-error.js";
import { verifyAccessToken, type TokenUserPayload } from "../security/tokens.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenUserPayload | undefined;
    }
  }
}

export function authGuard(options?: { allowMfaPending?: boolean | undefined }) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      let token: string | undefined;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      } else if (req.cookies && req.cookies.access_token) {
        token = req.cookies.access_token;
      }

      if (!token) {
        throw new UnauthorizedError("Authentication token missing", "TOKEN_MISSING");
      }

      const decoded = verifyAccessToken(token);

      if (decoded.isMfaPending && !options?.allowMfaPending) {
        throw new ForbiddenError("MFA verification required", "MFA_REQUIRED");
      }

      req.user = decoded;
      req.institutionId = decoded.institutionId;
      next();
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        next(error);
      } else {
        next(new UnauthorizedError("Invalid or expired authentication token", "TOKEN_INVALID"));
      }
    }
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      req.institutionId = decoded.institutionId;
    }
    next();
  } catch {
    next();
  }
}
