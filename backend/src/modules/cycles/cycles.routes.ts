import { Router } from "express";
import { CyclesController, createCycleSchema, updateCycleSchema } from "./cycles.controller.js";
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

router.get("/", asyncHandler(CyclesController.listCycles));
router.get("/:id", asyncHandler(CyclesController.getCycleById));

router.post(
  "/",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  validate({ body: createCycleSchema }),
  asyncHandler(CyclesController.createCycle),
);

router.patch(
  "/:id",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  concurrencyGuard,
  validate({ body: updateCycleSchema }),
  asyncHandler(CyclesController.updateCycle),
);

export const cyclesRouter: Router = router;
