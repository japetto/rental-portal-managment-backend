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

// Update a spot
router.patch(
  "/spots/:id",
  zodValidationRequest(AdminValidation.updateSpotValidationSchema),
  AdminController.updateSpot,
);

// Delete a spot
router.delete("/spots/:id", AdminController.deleteSpot);

// Service Request Management Routes (Admin only)
router.get(
  "/service-requests",
  zodValidationRequest(AdminValidation.adminGetServiceRequestsValidationSchema),
  AdminController.getAllServiceRequests,
);

router.get(
  "/service-requests/urgent",
  zodValidationRequest(
    AdminValidation.adminGetUrgentServiceRequestsValidationSchema,
  ),
  AdminController.getUrgentServiceRequests,
);

router.get(
  "/service-requests/dashboard-stats",
  AdminController.getServiceRequestDashboardStats,
);

router.get(
  "/service-requests/:id",
  zodValidationRequest(AdminValidation.adminGetServiceRequestValidationSchema),
  AdminController.getServiceRequestById,
);

router.patch(
  "/service-requests/:id",
  zodValidationRequest(
    AdminValidation.adminUpdateServiceRequestValidationSchema,
  ),
  AdminController.updateServiceRequest,
);

router.post(
  "/service-requests/:id/comment",
  zodValidationRequest(AdminValidation.adminAddCommentValidationSchema),
  AdminController.addAdminComment,
);

router.get(
  "/properties/:propertyId/service-requests",
  zodValidationRequest(
    AdminValidation.adminGetServiceRequestsByPropertyValidationSchema,
  ),
  AdminController.getServiceRequestsByProperty,
);

router.get(
  "/tenants/:tenantId/service-requests",
  zodValidationRequest(
    AdminValidation.adminGetServiceRequestsByTenantValidationSchema,
  ),
  AdminController.getServiceRequestsByTenant,
);

// Admin User Management Routes
router.get("/users", AdminController.getAllUsers);

// Get a user by id
router.get(
  "/users/:userId",
  zodValidationRequest(AdminValidation.adminGetUserValidationSchema),
  AdminController.getUserById,
);

// Update a user
router.patch(
  "/users/:userId",
  zodValidationRequest(AdminValidation.adminUpdateUserValidationSchema),
  AdminController.updateUser,
);

// Delete a user
router.delete(
  "/users/:userId",
  zodValidationRequest(AdminValidation.adminDeleteUserValidationSchema),
  AdminController.deleteUser,
);

// Test email endpoint for debugging
router.get("/test-email", AdminController.testEmail);

export const AdminRouter = router;
