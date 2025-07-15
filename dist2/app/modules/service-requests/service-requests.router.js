"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRequestRouter = void 0;
const express_1 = require("express");
const userAuth_1 = require("../../../middlewares/userAuth");
const zodValidationRequest_1 = __importDefault(require("../../../middlewares/zodValidationRequest"));
const service_requests_controller_1 = require("./service-requests.controller");
const service_requests_validation_1 = require("./service-requests.validation");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(userAuth_1.userAuth);
// Create service request (Tenants only)
router.post("/", (0, zodValidationRequest_1.default)(service_requests_validation_1.ServiceRequestValidation.createServiceRequestValidationSchema), service_requests_controller_1.ServiceRequestController.createServiceRequest);
// Get service request by ID
router.get("/:id", (0, zodValidationRequest_1.default)(service_requests_validation_1.ServiceRequestValidation.getServiceRequestValidationSchema), service_requests_controller_1.ServiceRequestController.getServiceRequestById);
// Get service requests with filters and pagination
router.get("/", (0, zodValidationRequest_1.default)(service_requests_validation_1.ServiceRequestValidation.getServiceRequestsValidationSchema), service_requests_controller_1.ServiceRequestController.getServiceRequests);
// Update service request (Tenants can update their own, Admins can update any)
router.patch("/:id", (0, zodValidationRequest_1.default)(service_requests_validation_1.ServiceRequestValidation.updateServiceRequestValidationSchema), service_requests_controller_1.ServiceRequestController.updateServiceRequest);
// Delete service request
router.delete("/:id", (0, zodValidationRequest_1.default)(service_requests_validation_1.ServiceRequestValidation.deleteServiceRequestValidationSchema), service_requests_controller_1.ServiceRequestController.deleteServiceRequest);
// Archive a service request
router.patch("/:id/archive", (0, zodValidationRequest_1.default)(service_requests_validation_1.ServiceRequestValidation.deleteServiceRequestValidationSchema), service_requests_controller_1.ServiceRequestController.archiveServiceRequest);
// Restore a service request
router.patch("/:id/restore", (0, zodValidationRequest_1.default)(service_requests_validation_1.ServiceRequestValidation.deleteServiceRequestValidationSchema), service_requests_controller_1.ServiceRequestController.restoreServiceRequest);
// Get archived service requests (admin only)
router.get("/archived", service_requests_controller_1.ServiceRequestController.getArchivedServiceRequests);
// Get service request statistics (Admin only)
router.get("/stats/overview", service_requests_controller_1.ServiceRequestController.getServiceRequestStats);
exports.ServiceRequestRouter = router;
