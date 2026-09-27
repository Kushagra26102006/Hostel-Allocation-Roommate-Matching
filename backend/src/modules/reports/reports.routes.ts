import { Router } from "express";
import { ReportsController } from "./reports.controller.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);
router.use(roleGuard(["sys_admin", "chief_warden", "hostel_admin", "dean"]));

router.get("/occupancy", asyncHandler(ReportsController.getOccupancy));
router.get("/satisfaction", asyncHandler(ReportsController.getSatisfaction));
router.get("/overrides", asyncHandler(ReportsController.getOverrides));
router.get("/waitlist", asyncHandler(ReportsController.getWaitlist));
router.get("/fairness", asyncHandler(ReportsController.getFairness));
router.get("/cycle-time", asyncHandler(ReportsController.getCycleTime));

export const reportsRouter: Router = router;
