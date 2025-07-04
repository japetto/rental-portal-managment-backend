"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const users_service_1 = require("./users.service");
// User Register
const userRegister = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userInfo = __rest(req.body, []);
    const result = yield users_service_1.UserService.userRegister(userInfo);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Registration Successful",
        data: result,
    });
}));
// User Login
const userLogin = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authCredentials = __rest(req.body, []);
    const result = yield users_service_1.UserService.userLogin(authCredentials);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Login Successful",
        data: result,
    });
}));
// // Check User Exists
// const checkUserForProviderLogin = catchAsync(
//   async (req: Request, res: Response) => {
//     const { ...userInfo } = req.body;
//     const result = await UserService.checkUserForProviderLogin(userInfo);
//     sendResponse(res, {
//       success: true,
//       statusCode: httpStatus.OK,
//       message: "Login Successful",
//       data: result,
//     });
//   },
// );
// // Check User Exists
// const providerLogin = catchAsync(async (req: Request, res: Response) => {
//   const { userInfo, authMethod } = req.body;
//   const result = await UserService.providerLogin(userInfo, authMethod);
//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: "Login Successful",
//     data: result,
//   });
// });
// // Update User
// const updatedUser = catchAsync(async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const { ...payload } = req.body;
//   const token = verifyAuthToken(req);
//   const result = await UserService.updateUser(id, payload, token);
//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: "User Updated Successfully",
//     data: result,
//   });
// });
// // Update User
// const updatePassword = catchAsync(async (req: Request, res: Response) => {
//   const { ...payload } = req.body;
//   const token = verifyAuthToken(req);
//   const result = await UserService.updatePassword(payload, token);
//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: "User Updated Successfully",
//     data: result,
//   });
// });
// // Find User For Forgot Password
// const findUserForForgotPassword = catchAsync(
//   async (req: Request, res: Response) => {
//     const { email } = req.body;
//     const result = await UserService.findUserForForgotPassword(email);
//     sendResponse(res, {
//       success: true,
//       statusCode: httpStatus.OK,
//       message: "OTP has been sent to your email",
//       data: result,
//     });
//   },
// );
// // Find User For Forgot Password
// const verifyOtpForForgotPassword = catchAsync(
//   async (req: Request, res: Response) => {
//     const { email, otp } = req.body;
//     const result = await UserService.verifyOtpForForgotPassword(email, otp);
//     sendResponse(res, {
//       success: true,
//       statusCode: httpStatus.OK,
//       message: "OTP Successfully Verified!",
//       data: result,
//     });
//   },
// );
// // Forgot Password
// const forgotPassword = catchAsync(async (req: Request, res: Response) => {
//   const { ...payload } = req.body;
//   const result = await UserService.forgotPassword(payload);
//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: "Password Updated Successfully",
//     data: result,
//   });
// });
// Set Password for Invited Users
const setPassword = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const passwordData = __rest(req.body, []);
    const result = yield users_service_1.UserService.setPassword(passwordData);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Password set successfully",
        data: result,
    });
}));
// Update User Info (Admin only)
const updateUserInfo = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { userId } = req.params;
    const updateData = __rest(req.body, []);
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield users_service_1.UserService.updateUserInfo(userId, updateData, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "User information updated successfully",
        data: result,
    });
}));
// Delete User (Super Admin only)
const deleteUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { userId } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield users_service_1.UserService.deleteUser(userId, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "User deleted successfully",
        data: result,
    });
}));
// Get All Users (Admin only)
const getAllUsers = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield users_service_1.UserService.getAllUsers(adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Users retrieved successfully",
        data: result,
    });
}));
// Get All Tenants (Admin only)
const getAllTenants = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield users_service_1.UserService.getAllTenants(adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Tenants retrieved successfully",
        data: result,
    });
}));
// Get User by ID (Admin only)
const getUserById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { userId } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield users_service_1.UserService.getUserById(userId, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "User retrieved successfully",
        data: result,
    });
}));
// Check User Invitation Status
const checkUserInvitationStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.params;
    const result = yield users_service_1.UserService.checkUserInvitationStatus(email);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "User invitation status retrieved successfully",
        data: result,
    });
}));
exports.UserController = {
    userRegister,
    userLogin,
    setPassword,
    updateUserInfo,
    deleteUser,
    getAllUsers,
    getAllTenants,
    getUserById,
    checkUserInvitationStatus,
    // checkUserForProviderLogin,
    // providerLogin,
    // updatedUser,
    // updatePassword,
    // findUserForForgotPassword,
    // verifyOtpForForgotPassword,
    // forgotPassword,
};
