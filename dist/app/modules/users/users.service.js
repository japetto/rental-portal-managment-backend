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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const http_status_1 = __importDefault(require("http-status"));
const config_1 = __importDefault(require("../../../config/config"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const users_schema_1 = require("./users.schema");
const users_utils_1 = require("./users.utils");
//* User Register Custom
const userRegister = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, phoneNumber } = payload;
    const isExistsUser = yield users_schema_1.Users.findOne({
        $or: [{ email }, { phoneNumber }],
    });
    if (isExistsUser) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "Email or Contact Already Exists");
    }
    // For regular user registration, set appropriate flags
    const userData = Object.assign(Object.assign({}, payload), { isInvited: false, isVerified: true });
    const user = yield users_schema_1.Users.create(userData);
    return (0, users_utils_1.generateAuthToken)(user);
});
//* User Login Custom
const userLogin = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = payload;
    const isExists = yield users_schema_1.Users.findOne({ email: email }).select("+password");
    if (!isExists) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid Email Or Password");
    }
    // Check if user is invited but hasn't set password yet
    if (isExists.isInvited && (!isExists.password || isExists.password === "")) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Please set your password first. Use the set-password endpoint.");
    }
    // Check if user is verified
    if (!isExists.isVerified) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Account not verified. Please contact administrator.");
    }
    const checkPassword = yield bcrypt_1.default.compare(password, isExists.password);
    if (!checkPassword) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid Email Or Password");
    }
    return (0, users_utils_1.generateAuthToken)(isExists);
});
//* Set Password for Invited Users
const setPassword = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = payload;
    const user = yield users_schema_1.Users.findOne({ email }).select("+password");
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    if (!user.isInvited) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "User is not invited. Cannot set password.");
    }
    if (user.password && user.password !== "") {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Password already set. Use update password instead.");
    }
    const hashedPassword = yield bcrypt_1.default.hash(password, Number(config_1.default.salt_round));
    yield users_schema_1.Users.findOneAndUpdate({ email }, {
        password: hashedPassword,
        isInvited: false,
        isVerified: true,
    }, { new: true });
    return {
        message: "Password set successfully. You can now login.",
    };
});
//* Update User Info (Admin only)
const updateUserInfo = (userId, payload, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // Check if the admin is trying to update themselves
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can update user information");
    }
    // Check for phone number uniqueness if being updated
    if (payload.phoneNumber && payload.phoneNumber !== user.phoneNumber) {
        const existingUser = yield users_schema_1.Users.findOne({
            phoneNumber: payload.phoneNumber,
        });
        if (existingUser) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, "Phone number already exists");
        }
    }
    const updatedUser = yield users_schema_1.Users.findByIdAndUpdate(userId, payload, {
        new: true,
        runValidators: true,
    });
    if (!updatedUser) {
        throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to update user");
    }
    return updatedUser;
});
//* Delete User (Super Admin only, cannot delete self)
const deleteUser = (userId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    // Prevent admin from deleting themselves
    if (userId === adminId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Cannot delete your own account");
    }
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can delete users");
    }
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // Check if user has active leases or other dependencies
    // You might want to add additional checks here based on your business logic
    if (user.propertyId || user.spotId) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot delete user with active property or spot assignments. Please remove assignments first.");
    }
    yield users_schema_1.Users.findByIdAndDelete(userId);
    return {
        message: "User deleted successfully",
    };
});
//* Get All Users (Admin only)
const getAllUsers = (adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view all users");
    }
    const users = yield users_schema_1.Users.find({}).select("-password");
    return users;
});
//* Get User by ID (Admin only)
const getUserById = (userId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view user details");
    }
    const user = yield users_schema_1.Users.findById(userId).select("-password");
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    return user;
});
//* Check User Invitation Status
const checkUserInvitationStatus = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield users_schema_1.Users.findOne({ email }).select("+password");
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    return {
        isInvited: user.isInvited || false,
        isVerified: user.isVerified || false,
        hasPassword: !!(user.password && user.password !== ""),
    };
});
exports.UserService = {
    userRegister,
    userLogin,
    setPassword,
    updateUserInfo,
    deleteUser,
    getAllUsers,
    getUserById,
    checkUserInvitationStatus,
};
