import { Router } from "express";
import { AllocationController, allocateSchema } from "./allocation.controller.js";
import { validate } from "../../common/validation/index.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

// SSE event stream is accessible with auth token in query or headers
router.get("/runs/:id/events", asyncHandler(AllocationController.streamEvents));

router.use(authGuard());
router.use(tenantMiddleware);

router.post(
  "/cycles/:id/allocate",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  validate({ body: allocateSchema }),
  asyncHandler(AllocationController.allocate),
);

router.get("/runs/:id", asyncHandler(AllocationController.getRun));
router.delete(
  "/runs/:id",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  asyncHandler(AllocationController.cancelRun),
);

export const allocationRouter: Router = router;
