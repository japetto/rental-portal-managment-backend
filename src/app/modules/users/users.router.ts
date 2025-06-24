import express from "express";
import { UserController } from "./users.controller";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
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

router.post(
  "/checkUserForProviderLogin",
  zodValidationRequest(UserValidation.checkUserForProviderLoginValidation),
  UserController.checkUserForProviderLogin,
);

router.post(
  "/providerLogin",
  zodValidationRequest(UserValidation.providerLoginZodSchema),
  UserController.providerLogin,
);

router.patch(
  "/updateUser/:id",
  zodValidationRequest(UserValidation.userUpdateZodSchema),
  UserController.updatedUser,
);

router.patch(
  "/updatePassword",
  zodValidationRequest(UserValidation.updatePasswordZodSchema),
  UserController.updatePassword,
);

router.post(
  "/findUserForForgotPassword",
  UserController.findUserForForgotPassword,
);

router.post(
  "/verifyOtpForForgotPassword",
  UserController.verifyOtpForForgotPassword,
);

router.patch("/forgotPassword", UserController.forgotPassword);

export const UserRouter = router;
