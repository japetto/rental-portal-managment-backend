import { Router } from "express";
import { userAuth } from "../../../middlewares/userAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import { ServiceRequestController } from "./service-requests.controller";
import { ServiceRequestValidation } from "./service-requests.validation";

const router = Router();

// Apply authentication middleware to all routes
router.use(userAuth);

// Create service request (Tenants only)
router.post(
  "/",
  zodValidationRequest(
    ServiceRequestValidation.createServiceRequestValidationSchema,
  ),
  ServiceRequestController.createServiceRequest,
);

// Get service request by ID
router.get(
  "/:id",
  zodValidationRequest(
    ServiceRequestValidation.getServiceRequestValidationSchema,
  ),
  ServiceRequestController.getServiceRequestById,
);

// Get service requests with filters and pagination
router.get(
  "/",
  zodValidationRequest(
    ServiceRequestValidation.getServiceRequestsValidationSchema,
  ),
  ServiceRequestController.getServiceRequests,
);

// Update service request (Tenants can update their own, Admins can update any)
router.patch(
  "/:id",
  zodValidationRequest(
    ServiceRequestValidation.updateServiceRequestValidationSchema,
  ),
  ServiceRequestController.updateServiceRequest,
);

// Delete service request
router.delete(
  "/:id",
  zodValidationRequest(
    ServiceRequestValidation.deleteServiceRequestValidationSchema,
  ),
  ServiceRequestController.deleteServiceRequest,
);

// Get service request statistics (Admin only)
router.get("/stats/overview", ServiceRequestController.getServiceRequestStats);

export const ServiceRequestRoutes = router;
