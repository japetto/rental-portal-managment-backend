"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeasesRoutes = void 0;
const express_1 = __importDefault(require("express"));
const adminAuth_1 = require("../../../middlewares/adminAuth");
const userAuth_1 = require("../../../middlewares/userAuth");
const zodValidationRequest_1 = __importDefault(require("../../../middlewares/zodValidationRequest"));
const leases_controller_1 = require("./leases.controller");
const leases_validation_1 = require("./leases.validation");
const router = express_1.default.Router();
// Create lease (Admin only)
router.post("/", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(leases_validation_1.LeasesValidation.createLeaseValidationSchema), leases_controller_1.LeasesController.createLease);
// Get all leases with filters and pagination (Admin only)
router.get("/", adminAuth_1.adminAuth, leases_controller_1.LeasesController.getAllLeases);
// Get lease by ID (Admin and tenant can access their own lease)
router.get("/:id", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(leases_validation_1.LeasesValidation.getLeaseByIdValidationSchema), leases_controller_1.LeasesController.getLeaseById);
// Get leases by tenant ID (Admin and tenant can access their own leases)
router.get("/tenant/:tenantId", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(leases_validation_1.LeasesValidation.getLeasesByTenantValidationSchema), leases_controller_1.LeasesController.getLeasesByTenant);
// Update lease (Admin only)
router.patch("/:id", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(leases_validation_1.LeasesValidation.updateLeaseValidationSchema), leases_controller_1.LeasesController.updateLease);
// Delete lease (Admin only)
router.delete("/:id", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(leases_validation_1.LeasesValidation.deleteLeaseValidationSchema), leases_controller_1.LeasesController.deleteLease);
// Get active leases by property (Admin only)
router.get("/property/:propertyId/active", adminAuth_1.adminAuth, leases_controller_1.LeasesController.getActiveLeasesByProperty);
// Get lease statistics (Admin only)
router.get("/statistics", adminAuth_1.adminAuth, leases_controller_1.LeasesController.getLeaseStatistics);
exports.LeasesRoutes = router;
