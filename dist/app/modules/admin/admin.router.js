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
// Property management routes
router.post("/properties", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.createPropertyValidationSchema), admin_controller_1.AdminController.createProperty);
router.get("/properties", admin_controller_1.AdminController.getAllProperties);
router.get("/properties/:id", admin_controller_1.AdminController.getPropertyById);
router.patch("/properties/:id", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.updatePropertyValidationSchema), admin_controller_1.AdminController.updateProperty);
router.delete("/properties/:id", admin_controller_1.AdminController.deleteProperty);
// Spot management routes
router.post("/spots", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.createSpotValidationSchema), admin_controller_1.AdminController.createSpot);
router.get("/properties/:propertyId/spots", admin_controller_1.AdminController.getSpotsByProperty);
router.get("/spots/:id", admin_controller_1.AdminController.getSpotById);
router.patch("/spots/:id", (0, zodValidationRequest_1.default)(admin_validation_1.AdminValidation.updateSpotValidationSchema), admin_controller_1.AdminController.updateSpot);
router.delete("/spots/:id", admin_controller_1.AdminController.deleteSpot);
exports.AdminRouter = router;
