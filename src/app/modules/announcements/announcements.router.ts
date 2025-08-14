import express from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import { userAuth } from "../../../middlewares/userAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import { AnnouncementController } from "./announcements.controller";
import { AnnouncementValidation } from "./announcements.validation";

const router = express.Router();

// Tenant routes - require user authentication
router.get("/tenant", userAuth, AnnouncementController.getTenantAnnouncements);

// Admin routes - require authentication
router.post(
  "/",
  adminAuth,
  zodValidationRequest(
    AnnouncementValidation.createAnnouncementValidationSchema,
  ),
  AnnouncementController.createAnnouncement,
);

router.get("/", adminAuth, AnnouncementController.getAllAnnouncements);

router.get(
  "/:announcementId",
  adminAuth,
  zodValidationRequest(
    AnnouncementValidation.getAnnouncementByIdValidationSchema,
  ),
  AnnouncementController.getAnnouncementById,
);

router.patch(
  "/:announcementId",
  adminAuth,
  zodValidationRequest(
    AnnouncementValidation.updateAnnouncementValidationSchema,
  ),
  AnnouncementController.updateAnnouncement,
);

router.delete(
  "/:announcementId",
  adminAuth,
  zodValidationRequest(
    AnnouncementValidation.deleteAnnouncementValidationSchema,
  ),
  AnnouncementController.deleteAnnouncement,
);

// Archive an announcement
router.patch(
  "/:announcementId/archive",
  adminAuth,
  zodValidationRequest(
    AnnouncementValidation.deleteAnnouncementValidationSchema,
  ),
  AnnouncementController.archiveAnnouncement,
);

// Restore an announcement
router.patch(
  "/:announcementId/restore",
  adminAuth,
  zodValidationRequest(
    AnnouncementValidation.deleteAnnouncementValidationSchema,
  ),
  AnnouncementController.restoreAnnouncement,
);

// Get archived announcements
router.get(
  "/archived",
  adminAuth,
  AnnouncementController.getArchivedAnnouncements,
);

// Filter routes (Admin only)
router.get(
  "/property/:propertyId",
  adminAuth,
  zodValidationRequest(
    AnnouncementValidation.getAnnouncementsByPropertyValidationSchema,
  ),
  AnnouncementController.getAnnouncementsByProperty,
);

router.get(
  "/type/:type",
  adminAuth,
  zodValidationRequest(
    AnnouncementValidation.getAnnouncementsByTypeValidationSchema,
  ),
  AnnouncementController.getAnnouncementsByType,
);

router.get(
  "/priority/:priority",
  adminAuth,
  zodValidationRequest(
    AnnouncementValidation.getAnnouncementsByPriorityValidationSchema,
  ),
  AnnouncementController.getAnnouncementsByPriority,
);

export const AnnouncementRouter = router;
