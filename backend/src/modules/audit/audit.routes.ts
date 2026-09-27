import { Router } from "express";
import { AuditController } from "./audit.controller.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);
router.use(roleGuard(["sys_admin", "chief_warden", "hostel_admin", "dean"]));

router.get("/", asyncHandler(AuditController.getAuditLogs));

export const auditRouter: Router = router;
