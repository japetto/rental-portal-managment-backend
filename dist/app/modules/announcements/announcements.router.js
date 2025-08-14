"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementRouter = void 0;
const express_1 = __importDefault(require("express"));
const adminAuth_1 = require("../../../middlewares/adminAuth");
const userAuth_1 = require("../../../middlewares/userAuth");
const zodValidationRequest_1 = __importDefault(require("../../../middlewares/zodValidationRequest"));
const announcements_controller_1 = require("./announcements.controller");
const announcements_validation_1 = require("./announcements.validation");
const router = express_1.default.Router();
// Tenant routes - require user authentication
router.get("/tenant", userAuth_1.userAuth, announcements_controller_1.AnnouncementController.getTenantAnnouncements);
// Admin routes - require authentication
router.post("/", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.createAnnouncementValidationSchema), announcements_controller_1.AnnouncementController.createAnnouncement);
router.get("/", adminAuth_1.adminAuth, announcements_controller_1.AnnouncementController.getAllAnnouncements);
router.get("/:announcementId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.getAnnouncementByIdValidationSchema), announcements_controller_1.AnnouncementController.getAnnouncementById);
router.patch("/:announcementId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.updateAnnouncementValidationSchema), announcements_controller_1.AnnouncementController.updateAnnouncement);
router.delete("/:announcementId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.deleteAnnouncementValidationSchema), announcements_controller_1.AnnouncementController.deleteAnnouncement);
// Archive an announcement
router.patch("/:announcementId/archive", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.deleteAnnouncementValidationSchema), announcements_controller_1.AnnouncementController.archiveAnnouncement);
// Restore an announcement
router.patch("/:announcementId/restore", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.deleteAnnouncementValidationSchema), announcements_controller_1.AnnouncementController.restoreAnnouncement);
// Get archived announcements
router.get("/archived", adminAuth_1.adminAuth, announcements_controller_1.AnnouncementController.getArchivedAnnouncements);
// Filter routes (Admin only)
router.get("/property/:propertyId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.getAnnouncementsByPropertyValidationSchema), announcements_controller_1.AnnouncementController.getAnnouncementsByProperty);
router.get("/type/:type", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.getAnnouncementsByTypeValidationSchema), announcements_controller_1.AnnouncementController.getAnnouncementsByType);
router.get("/priority/:priority", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.getAnnouncementsByPriorityValidationSchema), announcements_controller_1.AnnouncementController.getAnnouncementsByPriority);
exports.AnnouncementRouter = router;
