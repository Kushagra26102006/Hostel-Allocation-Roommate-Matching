import { Router } from "express";
import { ReviewController, overrideSchema, approvalActionSchema } from "./review.controller.js";
import { validate } from "../../common/validation/index.js";
import {
  authGuard,
  roleGuard,
  tenantMiddleware,
  concurrencyGuard,
} from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);

router.get("/drafts/:id", asyncHandler(ReviewController.getDraft));
router.get("/drafts/:id/assignments", asyncHandler(ReviewController.listAssignments));
router.get("/assignments/:id/explanation", asyncHandler(ReviewController.getExplanation));

router.post(
  "/drafts/:id/override",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin", "warden"]),
  concurrencyGuard,
  validate({ body: overrideSchema }),
  asyncHandler(ReviewController.overrideAssignment),
);

router.post(
  "/drafts/:id/submit-review",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin", "warden"]),
  asyncHandler(ReviewController.submitReview),
);

router.post(
  "/drafts/:id/approve",
  roleGuard(["sys_admin", "chief_warden"]),
  validate({ body: approvalActionSchema }),
  asyncHandler(ReviewController.approveDraft),
);

router.post(
  "/drafts/:id/request-changes",
  roleGuard(["sys_admin", "chief_warden"]),
  validate({ body: approvalActionSchema }),
  asyncHandler(ReviewController.requestChanges),
);

export const reviewRouter: Router = router;
