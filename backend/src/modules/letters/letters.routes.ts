import { Router } from "express";
import { LettersController } from "./letters.controller.js";
import { authGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

// Public verification
router.get("/verify/:token", asyncHandler(LettersController.verifyLetterToken));

// Letters download (authenticated)
router.get(
  "/letters/:id",
  authGuard(),
  tenantMiddleware,
  asyncHandler(LettersController.getLetterPdf),
);

export const lettersRouter: Router = router;
