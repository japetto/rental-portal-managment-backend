import express from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
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
