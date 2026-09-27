import { Router } from "express";
import { AppealsController, createAppealSchema, decideAppealSchema } from "./appeals.controller.js";
import { validate } from "../../common/validation/index.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);

router.get("/", asyncHandler(AppealsController.listAppeals));

router.post(
  "/",
  roleGuard(["student", "sys_admin", "hostel_admin"]),
  validate({ body: createAppealSchema }),
  asyncHandler(AppealsController.createAppeal),
);

router.post(
  "/:id/decision",
  roleGuard(["sys_admin", "chief_warden", "dean", "warden"]),
  validate({ body: decideAppealSchema }),
  asyncHandler(AppealsController.decideAppeal),
);

export const appealsRouter: Router = router;
