import { Router } from "express";
import {
  AuthController,
  loginSchema,
  mfaVerifySchema,
  ssoCallbackSchema,
} from "./auth.controller.js";
import { validate } from "../../common/validation/index.js";
import {
  authGuard,
  authRateLimiter,
  mfaRateLimiter,
  tenantMiddleware,
} from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.post(
  "/login",
  authRateLimiter,
  tenantMiddleware,
  validate({ body: loginSchema }),
  asyncHandler(AuthController.login),
);

router.post(
  "/mfa/verify",
  mfaRateLimiter,
  tenantMiddleware,
  validate({ body: mfaVerifySchema }),
  asyncHandler(AuthController.verifyMfa),
);

router.post(
  "/sso/callback",
  tenantMiddleware,
  validate({ body: ssoCallbackSchema }),
  asyncHandler(AuthController.ssoCallback),
);

router.post("/refresh", asyncHandler(AuthController.refreshToken));
router.post("/logout", asyncHandler(AuthController.logout));

router.get("/me", authGuard(), tenantMiddleware, asyncHandler(AuthController.getMe));

export const authRouter: Router = router;
