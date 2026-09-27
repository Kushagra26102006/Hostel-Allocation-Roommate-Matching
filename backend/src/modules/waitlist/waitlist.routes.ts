import { Router } from "express";
import { WaitlistController, promoteWaitlistSchema } from "./waitlist.controller.js";
import { validate } from "../../common/validation/index.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);

router.get("/", asyncHandler(WaitlistController.listWaitlist));

router.post(
  "/:id/promote",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin", "warden"]),
  validate({ body: promoteWaitlistSchema }),
  asyncHandler(WaitlistController.promote),
);

export const waitlistRouter: Router = router;
