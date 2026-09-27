import { Router } from "express";
import {
  ApplicationsController,
  createApplicationSchema,
  updateApplicationSchema,
  uploadDocumentSchema,
  verifyDocumentSchema,
  setPreferencesSchema,
  questionnaireSchema,
} from "./applications.controller.js";
import { validate } from "../../common/validation/index.js";
import { authGuard, roleGuard, tenantMiddleware } from "../../common/middleware/index.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

const router = Router();

router.use(authGuard());
router.use(tenantMiddleware);

// Cycle Applications
router.get("/cycles/:id/applications", asyncHandler(ApplicationsController.listCycleApplications));
router.post(
  "/cycles/:id/applications",
  roleGuard(["student", "sys_admin", "hostel_admin"]),
  validate({ body: createApplicationSchema }),
  asyncHandler(ApplicationsController.createApplication),
);

// Single Application routes
router.get("/applications/me", asyncHandler(ApplicationsController.getStudentActiveApplication));
router.get("/applications/:id", asyncHandler(ApplicationsController.getApplicationById));
router.patch(
  "/applications/:id",
  validate({ body: updateApplicationSchema }),
  asyncHandler(ApplicationsController.updateApplication),
);

// Documents
router.post(
  "/applications/:id/documents",
  validate({ body: uploadDocumentSchema }),
  asyncHandler(ApplicationsController.uploadDocument),
);
router.post(
  "/applications/:id/verify",
  roleGuard(["warden", "chief_warden", "hostel_admin", "sys_admin"]),
  validate({ body: verifyDocumentSchema }),
  asyncHandler(ApplicationsController.verifyDocument),
);

// Eligibility & Preferences
router.get("/applications/:id/eligibility", asyncHandler(ApplicationsController.getEligibility));
router.put(
  "/applications/:id/preferences",
  validate({ body: setPreferencesSchema }),
  asyncHandler(ApplicationsController.setPreferences),
);

// Questionnaire & Consent endpoints (/me/...)
router.get("/me/questionnaire", asyncHandler(ApplicationsController.getQuestionnaire));
router.put(
  "/me/questionnaire",
  validate({ body: questionnaireSchema }),
  asyncHandler(ApplicationsController.saveQuestionnaire),
);
router.delete("/me/questionnaire", asyncHandler(ApplicationsController.deleteQuestionnaire));

router.post("/me/consents/:purpose", asyncHandler(ApplicationsController.grantConsent));
router.delete("/me/consents/:purpose", asyncHandler(ApplicationsController.revokeConsent));

export const applicationsRouter: Router = router;
