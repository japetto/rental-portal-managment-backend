import express from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import { userAuth } from "../../../middlewares/userAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import { AnnouncementValidation } from "../announcements/announcements.validation";
import { ServiceRequestValidation } from "../service-requests/service-requests.validation";
import { UserController } from "./users.controller";
import { UserValidation } from "./users.validation";

const router = express.Router();

router.post(
  "/register",
  zodValidationRequest(UserValidation.usersZodSchema),
  UserController.userRegister,
);

router.post(
  "/login",
  zodValidationRequest(UserValidation.loginUserZodSchema),
  UserController.userLogin,
);

// Set password for invited users
router.post(
  "/set-password",
  zodValidationRequest(UserValidation.setPasswordValidationSchema),
  UserController.setPassword,
);

// Check user invitation status
router.get("/check-status/:email", UserController.checkUserInvitationStatus);

// Admin routes - require authentication
router.get("/", adminAuth, UserController.getAllUsers);

router.get("/tenants", adminAuth, UserController.getAllTenants);

// User routes - require user authentication (must come before parameterized routes)
// Get user's service requests
router.get(
  "/service-requests",
  userAuth,
  zodValidationRequest(
    ServiceRequestValidation.getServiceRequestsValidationSchema,
  ),
  UserController.getUserServiceRequests,
);

// Get user's specific service request
router.get(
  "/service-requests/:id",
  userAuth,
  zodValidationRequest(
    ServiceRequestValidation.getServiceRequestValidationSchema,
  ),
  UserController.getUserServiceRequestById,
);

// Get user's announcements
router.get(
  "/announcements",
  userAuth,
  zodValidationRequest(UserValidation.getUserAnnouncementsValidationSchema),
  UserController.getUserAnnouncements,
);

// Get user's specific announcement
router.get(
  "/announcements/:announcementId",
  userAuth,
  zodValidationRequest(
    AnnouncementValidation.getAnnouncementByIdValidationSchema,
  ),
  UserController.getUserAnnouncementById,
);

// Mark announcement as read
router.post(
  "/announcements/mark-read",
  userAuth,
  zodValidationRequest(AnnouncementValidation.markAsReadValidationSchema),
  UserController.markAnnouncementAsRead,
);

// Get user's own profile
router.get("/me", userAuth, UserController.getMyProfile);

// Get user's payment history
router.get("/payment-history", userAuth, UserController.getPaymentHistory);

// Admin parameterized routes - must come after specific routes
router.get("/:userId", adminAuth, UserController.getUserById);

router.patch(
  "/:userId",
  adminAuth,
  zodValidationRequest(UserValidation.updateUserInfoValidationSchema),
  UserController.updateUserInfo,
);

router.delete(
  "/:userId",
  adminAuth,
  zodValidationRequest(UserValidation.deleteUserValidationSchema),
  UserController.deleteUser,
);

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

export const UserRouter = router;
