import express from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import { userAuth } from "../../../middlewares/userAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import { LeasesController } from "./leases.controller";
import { LeasesValidation } from "./leases.validation";

const router = express.Router();

// Create lease (Admin only)
router.post(
  "/",
  adminAuth,
  zodValidationRequest(LeasesValidation.createLeaseValidationSchema),
  LeasesController.createLease,
);

// Get all leases with filters and pagination (Admin only)
router.get("/", adminAuth, LeasesController.getAllLeases);

// Get lease by ID (Admin and tenant can access their own lease)
router.get(
  "/:id",
  userAuth,
  zodValidationRequest(LeasesValidation.getLeaseByIdValidationSchema),
  LeasesController.getLeaseById,
);

// Get leases by tenant ID (Admin and tenant can access their own leases)
router.get(
  "/tenant/:tenantId",
  userAuth,
  zodValidationRequest(LeasesValidation.getLeasesByTenantValidationSchema),
  LeasesController.getLeasesByTenant,
);

// Update lease (Admin only)
router.patch(
  "/:id",
  adminAuth,
  zodValidationRequest(LeasesValidation.updateLeaseValidationSchema),
  LeasesController.updateLease,
);

// Delete lease (Admin only)
router.delete(
  "/:id",
  adminAuth,
  zodValidationRequest(LeasesValidation.deleteLeaseValidationSchema),
  LeasesController.deleteLease,
);

// Get active leases by property (Admin only)
router.get(
  "/property/:propertyId/active",
  adminAuth,
  LeasesController.getActiveLeasesByProperty,
);

// Get lease statistics (Admin only)
router.get("/statistics", adminAuth, LeasesController.getLeaseStatistics);

export const LeasesRoutes = router;
