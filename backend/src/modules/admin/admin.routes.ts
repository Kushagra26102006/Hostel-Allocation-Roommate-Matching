import { Router } from "express";
import { AdminController, createApiKeySchema, createWebhookSchema } from "./admin.controller.js";
import { validate } from "../../common/validation/index.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);
router.use(roleGuard(["sys_admin", "chief_warden", "hostel_admin"]));

// API Keys
router.get("/api-keys", asyncHandler(AdminController.listApiKeys));
router.post(
  "/api-keys",
  validate({ body: createApiKeySchema }),
  asyncHandler(AdminController.createApiKey),
);
router.delete("/api-keys/:id", asyncHandler(AdminController.deleteApiKey));

// Webhooks
router.get("/webhooks", asyncHandler(AdminController.listWebhooks));
router.post(
  "/webhooks",
  validate({ body: createWebhookSchema }),
  asyncHandler(AdminController.createWebhook),
);
router.delete("/webhooks/:id", asyncHandler(AdminController.deleteWebhook));

export const adminRouter: Router = router;
