"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRouter = void 0;
const express_1 = __importDefault(require("express"));
const adminAuth_1 = require("../../../middlewares/adminAuth");
const userAuth_1 = require("../../../middlewares/userAuth");
const zodValidationRequest_1 = __importDefault(require("../../../middlewares/zodValidationRequest"));
const announcements_validation_1 = require("../announcements/announcements.validation");
const service_requests_validation_1 = require("../service-requests/service-requests.validation");
const users_controller_1 = require("./users.controller");
const users_validation_1 = require("./users.validation");
const router = express_1.default.Router();
router.post("/register", (0, zodValidationRequest_1.default)(users_validation_1.UserValidation.usersZodSchema), users_controller_1.UserController.userRegister);
router.post("/login", (0, zodValidationRequest_1.default)(users_validation_1.UserValidation.loginUserZodSchema), users_controller_1.UserController.userLogin);
// Set password for invited users
router.post("/set-password", (0, zodValidationRequest_1.default)(users_validation_1.UserValidation.setPasswordValidationSchema), users_controller_1.UserController.setPassword);
// Check user invitation status
router.get("/check-status/:email", users_controller_1.UserController.checkUserInvitationStatus);
// Admin routes - require authentication
router.get("/", adminAuth_1.adminAuth, users_controller_1.UserController.getAllUsers);
router.get("/tenants", adminAuth_1.adminAuth, users_controller_1.UserController.getAllTenants);
// User routes - require user authentication (must come before parameterized routes)
// Get user's service requests
router.get("/service-requests", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(service_requests_validation_1.ServiceRequestValidation.getServiceRequestsValidationSchema), users_controller_1.UserController.getUserServiceRequests);
// Get user's specific service request
router.get("/service-requests/:id", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(service_requests_validation_1.ServiceRequestValidation.getServiceRequestValidationSchema), users_controller_1.UserController.getUserServiceRequestById);
// Get user's announcements
router.get("/announcements", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(users_validation_1.UserValidation.getUserAnnouncementsValidationSchema), users_controller_1.UserController.getUserAnnouncements);
// Get user's specific announcement
router.get("/announcements/:announcementId", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.getAnnouncementByIdValidationSchema), users_controller_1.UserController.getUserAnnouncementById);
// Mark announcement as read
router.post("/announcements/mark-read", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(announcements_validation_1.AnnouncementValidation.markAsReadValidationSchema), users_controller_1.UserController.markAnnouncementAsRead);
// Get user's own profile
router.get("/me", userAuth_1.userAuth, users_controller_1.UserController.getMyProfile);
// Get user's payment history
router.get("/payment-history", userAuth_1.userAuth, users_controller_1.UserController.getPaymentHistory);
// Get user's rent summary
router.get("/rent-summary", userAuth_1.userAuth, users_controller_1.UserController.getRentSummary);
// Create payment link for a specific payment
router.post("/payments/:paymentId/create-payment-link", userAuth_1.userAuth, users_controller_1.UserController.createPaymentLink);
// Admin parameterized routes - must come after specific routes
router.get("/:userId", adminAuth_1.adminAuth, users_controller_1.UserController.getUserById);
// Update user info route
router.patch("/:userId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(users_validation_1.UserValidation.updateUserInfoValidationSchema), users_controller_1.UserController.updateUserInfo);
// Update tenant data route
router.patch("/:userId/tenant-data", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(users_validation_1.UserValidation.updateTenantDataValidationSchema), users_controller_1.UserController.updateTenantData);
router.delete("/:userId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(users_validation_1.UserValidation.deleteUserValidationSchema), users_controller_1.UserController.deleteUser);
// router.post(
//   "/checkUserForProviderLogin",
//   zodValidationRequest(UserValidation.checkUserForProviderLoginValidation),
//   UserController.checkUserForProviderLogin,
// );
// router.post(
//   "/providerLogin",
//   zodValidationRequest(UserValidation.providerLoginZodSchema),
//   UserController.providerLogin,
// );
// router.patch(
//   "/updateUser/:id",
//   zodValidationRequest(UserValidation.userUpdateZodSchema),
//   UserController.updatedUser,
// );
// router.patch(
//   "/updatePassword",
//   zodValidationRequest(UserValidation.updatePasswordZodSchema),
//   UserController.updatePassword,
// );
// router.post(
//   "/findUserForForgotPassword",
//   UserController.findUserForForgotPassword,
// );
// router.post(
//   "/verifyOtpForForgotPassword",
//   UserController.verifyOtpForForgotPassword,
// );
// router.patch("/forgotPassword", UserController.forgotPassword);
exports.UserRouter = router;
