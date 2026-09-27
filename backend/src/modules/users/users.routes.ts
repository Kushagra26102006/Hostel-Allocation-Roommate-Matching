import { Router } from "express";
import { UsersController, createUserSchema, updateUserSchema } from "./users.controller.js";
import { validate } from "../../common/validation/index.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);

router.get(
  "/",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin", "dean"]),
  asyncHandler(UsersController.listUsers),
);

router.get("/:id", asyncHandler(UsersController.getUserById));

router.post(
  "/",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  validate({ body: createUserSchema }),
  asyncHandler(UsersController.createUser),
);

router.patch(
  "/:id",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  validate({ body: updateUserSchema }),
  asyncHandler(UsersController.updateUser),
);

export const usersRouter: Router = router;
