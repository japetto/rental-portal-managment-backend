import express from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = express.Router();

// Apply admin authentication to all routes
router.use(adminAuth);

// Tenant management routes
router.post(
  "/invite-tenant",
  zodValidationRequest(AdminValidation.inviteTenantValidationSchema),
  AdminController.inviteTenant,
);

// Get all tenants
router.get("/tenants", AdminController.getAllTenants);

// Property management routes
router.post(
  "/properties",
  zodValidationRequest(AdminValidation.createPropertyValidationSchema),
  AdminController.createProperty,
);

// Get all properties
router.get("/properties", AdminController.getAllProperties);

// Get a property by id
router.get("/properties/:id", AdminController.getPropertyById);

// Update a property
router.patch(
  "/properties/:id",
  zodValidationRequest(AdminValidation.updatePropertyValidationSchema),
  AdminController.updateProperty,
);

// Delete a property
router.delete("/properties/:id", AdminController.deleteProperty);

// Spot management routes
router.post(
  "/spots",
  zodValidationRequest(AdminValidation.createSpotValidationSchema),
  AdminController.createSpot,
);

// Get all spots by property (nested under properties)
router.get("/properties/:propertyId/spots", AdminController.getSpotsByProperty);

// Get a spot by id
router.get("/spots/:id", AdminController.getSpotById);

router.patch(
  "/spots/:id",
  zodValidationRequest(AdminValidation.updateSpotValidationSchema),
  AdminController.updateSpot,
);

router.delete("/spots/:id", AdminController.deleteSpot);

export const AdminRouter = router;
