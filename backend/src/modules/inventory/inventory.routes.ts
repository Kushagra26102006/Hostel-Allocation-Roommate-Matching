import { Router } from "express";
import {
  InventoryController,
  createHostelSchema,
  createBlockSchema,
  createRoomSchema,
  createBedSchema,
  updateBedSchema,
  importInventorySchema,
} from "./inventory.controller.js";
import { validate } from "../../common/validation/index.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);

// Hostels
router.get("/hostels", asyncHandler(InventoryController.listHostels));
router.post(
  "/hostels",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  validate({ body: createHostelSchema }),
  asyncHandler(InventoryController.createHostel),
);

// Blocks
router.get("/blocks", asyncHandler(InventoryController.listBlocks));
router.post(
  "/blocks",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  validate({ body: createBlockSchema }),
  asyncHandler(InventoryController.createBlock),
);

// Rooms
router.get("/rooms", asyncHandler(InventoryController.listRooms));
router.post(
  "/rooms",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  validate({ body: createRoomSchema }),
  asyncHandler(InventoryController.createRoom),
);

// Beds
router.get("/beds", asyncHandler(InventoryController.listBeds));
router.post(
  "/beds",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  validate({ body: createBedSchema }),
  asyncHandler(InventoryController.createBed),
);
router.patch(
  "/beds/:id",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin", "warden"]),
  validate({ body: updateBedSchema }),
  asyncHandler(InventoryController.updateBed),
);

// Import & Occupancy
router.post(
  "/import",
  roleGuard(["sys_admin", "chief_warden", "hostel_admin"]),
  validate({ body: importInventorySchema }),
  asyncHandler(InventoryController.importInventory),
);

router.get("/occupancy", asyncHandler(InventoryController.getOccupancy));

export const inventoryRouter: Router = router;
