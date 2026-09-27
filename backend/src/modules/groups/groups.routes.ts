import { Router } from "express";
import { GroupsController, createGroupSchema, inviteMemberSchema } from "./groups.controller.js";
import { validate } from "../../common/validation/index.js";
import { authGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);

router.get("/", asyncHandler(GroupsController.listGroups));
router.get("/me", asyncHandler(GroupsController.getMyGroup));

router.post("/", validate({ body: createGroupSchema }), asyncHandler(GroupsController.createGroup));

router.post(
  "/:id/invite",
  validate({ body: inviteMemberSchema }),
  asyncHandler(GroupsController.inviteMember),
);

router.post("/:id/accept", asyncHandler(GroupsController.acceptInvite));
router.delete("/:id", asyncHandler(GroupsController.leaveGroup));

export const groupsRouter: Router = router;
