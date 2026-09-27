import { Router } from "express";
import { PublicationController } from "./publication.controller.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);

router.post(
  "/drafts/:id/publish",
  roleGuard(["sys_admin", "chief_warden"]),
  asyncHandler(PublicationController.publish),
);

export const publicationRouter: Router = router;
