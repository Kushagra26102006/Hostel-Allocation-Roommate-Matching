import { Router } from "express";
import {
  RoomChangeController,
  createRoomChangeSchema,
  decideRoomChangeSchema,
} from "./room-change.controller.js";
import { validate } from "../../common/validation/index.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);

router.get("/", asyncHandler(RoomChangeController.listRoomChanges));

router.post(
  "/",
  roleGuard(["student", "sys_admin", "hostel_admin"]),
  validate({ body: createRoomChangeSchema }),
  asyncHandler(RoomChangeController.createRoomChange),
);

router.post(
  "/:id/decision",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin", "warden"]),
  validate({ body: decideRoomChangeSchema }),
  asyncHandler(RoomChangeController.decideRoomChange),
);

export const roomChangeRouter: Router = router;
