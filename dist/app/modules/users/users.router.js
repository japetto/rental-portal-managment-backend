"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRouter = void 0;
const express_1 = __importDefault(require("express"));
const adminAuth_1 = require("../../../middlewares/adminAuth");
const zodValidationRequest_1 = __importDefault(require("../../../middlewares/zodValidationRequest"));
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
router.get("/:userId", adminAuth_1.adminAuth, users_controller_1.UserController.getUserById);
router.patch("/:userId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(users_validation_1.UserValidation.updateUserInfoValidationSchema), users_controller_1.UserController.updateUserInfo);
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
