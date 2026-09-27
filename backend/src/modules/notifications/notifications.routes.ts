import { Router } from "express";
import { NotificationsController, updatePrefsSchema } from "./notifications.controller.js";
import { validate } from "../../common/validation/index.js";
import { authGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);

router.get("/", asyncHandler(NotificationsController.listNotifications));
router.patch("/:id", asyncHandler(NotificationsController.markAsRead));

router.get("/me/notification-preferences", asyncHandler(NotificationsController.getPreferences));
router.put(
  "/me/notification-preferences",
  validate({ body: updatePrefsSchema }),
  asyncHandler(NotificationsController.updatePreferences),
);

export const notificationsRouter: Router = router;
