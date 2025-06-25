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

// Property management routes
router.post(
  "/properties",
  zodValidationRequest(AdminValidation.createPropertyValidationSchema),
  AdminController.createProperty,
);

router.get("/properties", AdminController.getAllProperties);

router.get("/properties/:id", AdminController.getPropertyById);

router.patch(
  "/properties/:id",
  zodValidationRequest(AdminValidation.updatePropertyValidationSchema),
  AdminController.updateProperty,
);

router.delete("/properties/:id", AdminController.deleteProperty);

// Spot management routes
router.post(
  "/spots",
  zodValidationRequest(AdminValidation.createSpotValidationSchema),
  AdminController.createSpot,
);

router.get("/properties/:propertyId/spots", AdminController.getSpotsByProperty);

router.get("/spots/:id", AdminController.getSpotById);

router.patch(
  "/spots/:id",
  zodValidationRequest(AdminValidation.updateSpotValidationSchema),
  AdminController.updateSpot,
);

router.delete("/spots/:id", AdminController.deleteSpot);

export const AdminRouter = router;
