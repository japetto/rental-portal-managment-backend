"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRouter = void 0;
const express_1 = __importDefault(require("express"));
const adminAuth_1 = require("../../../middlewares/adminAuth");
const zodValidationRequest_1 = __importDefault(require("../../../middlewares/zodValidationRequest"));
const admin_controller_1 = require("./admin.controller");
const admin_validation_1 = require("./admin.validation");
const router = express_1.default.Router();
// Apply admin authentication to all routes
router.use(adminAuth_1.adminAuth);
// Tenant management routes
router.post("/invite-tenant", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.inviteTenantValidationSchema), admin_controller_1.AdminController.inviteTenant);
// Get all tenants
router.get("/tenants", admin_controller_1.AdminController.getAllTenants);
// Property management routes
// Create a property
router.post("/properties", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.createPropertyValidationSchema), admin_controller_1.AdminController.createProperty);
// Get all properties
router.get("/properties", admin_controller_1.AdminController.getAllProperties);
// Get a property by id
router.get("/properties/:id", admin_controller_1.AdminController.getPropertyById);
// Update a property
router.patch("/properties/:id", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.updatePropertyValidationSchema), admin_controller_1.AdminController.updateProperty);
// Delete a property
router.delete("/properties/:id", admin_controller_1.AdminController.deleteProperty);
// Archive a property
router.patch("/properties/:id/archive", admin_controller_1.AdminController.archiveProperty);
// Restore a property
router.patch("/properties/:id/restore", admin_controller_1.AdminController.restoreProperty);
// Get archived properties
router.get("/properties/archived", admin_controller_1.AdminController.getArchivedProperties);
// Spot management routes
router.post("/spots", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.createSpotValidationSchema), admin_controller_1.AdminController.createSpot);
// Get all spots by property (nested under properties)
router.get("/properties/:propertyId/spots", admin_controller_1.AdminController.getSpotsByProperty);
// Get a spot by id
router.get("/spots/:id", admin_controller_1.AdminController.getSpotById);
// Update a spot
router.patch("/spots/:id", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.updateSpotValidationSchema), admin_controller_1.AdminController.updateSpot);
// Delete a spot
router.delete("/spots/:id", admin_controller_1.AdminController.deleteSpot);
// Archive a spot
router.patch("/spots/:id/archive", admin_controller_1.AdminController.archiveSpot);
// Restore a spot
router.patch("/spots/:id/restore", admin_controller_1.AdminController.restoreSpot);
// Get archived spots
router.get("/spots/archived", admin_controller_1.AdminController.getArchivedSpots);
// Service Request Management Routes (Admin only)
router.get("/service-requests", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.adminGetServiceRequestsValidationSchema), admin_controller_1.AdminController.getAllServiceRequests);
router.get("/service-requests/urgent", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.adminGetUrgentServiceRequestsValidationSchema), admin_controller_1.AdminController.getUrgentServiceRequests);
router.get("/service-requests/dashboard-stats", admin_controller_1.AdminController.getServiceRequestDashboardStats);
router.get("/service-requests/:id", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.adminGetServiceRequestValidationSchema), admin_controller_1.AdminController.getServiceRequestById);
router.patch("/service-requests/:id", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.adminUpdateServiceRequestValidationSchema), admin_controller_1.AdminController.updateServiceRequest);
router.post("/service-requests/:id/comment", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.adminAddCommentValidationSchema), admin_controller_1.AdminController.addAdminComment);
router.get("/properties/:propertyId/service-requests", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.adminGetServiceRequestsByPropertyValidationSchema), admin_controller_1.AdminController.getServiceRequestsByProperty);
router.get("/tenants/:tenantId/service-requests", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.adminGetServiceRequestsByTenantValidationSchema), admin_controller_1.AdminController.getServiceRequestsByTenant);
// Admin User Management Routes
router.get("/users", admin_controller_1.AdminController.getAllUsers);
// Get a user by id
router.get("/users/:userId", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.adminGetUserValidationSchema), admin_controller_1.AdminController.getUserById);
// Update a user
router.patch("/users/:userId", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.adminUpdateUserValidationSchema), admin_controller_1.AdminController.updateUser);
// Delete a user
router.delete("/users/:userId", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.adminDeleteUserValidationSchema), admin_controller_1.AdminController.deleteUser);
// Test email endpoint for debugging
router.get("/test-email", admin_controller_1.AdminController.testEmail);
exports.AdminRouter = router;
