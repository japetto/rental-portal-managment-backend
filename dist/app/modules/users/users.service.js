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
const spots_schema_1 = require("../spots/spots.schema");
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
    // Check if user has a password (for invited users who haven't set password)
    if (!isExists.password || isExists.password === "") {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Please set your password first. Use the set-password endpoint.");
    }
    // Check if user is verified (only for non-invited users)
    if (!isExists.isInvited && !isExists.isVerified) {
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
    const { email, password, confirmPassword } = payload;
    // Validate password confirmation
    if (password !== confirmPassword) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Password and confirm password do not match");
    }
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
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "You cannot delete your own account. Please contact another administrator.");
    }
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Access denied. Only super administrators can delete users.");
    }
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found. The user may have already been deleted.");
    }
    // Cascade delete: Remove user assignments and update related data
    try {
        // If user has a spot assignment, free up the spot
        if (user.spotId) {
            yield spots_schema_1.Spots.findByIdAndUpdate(user.spotId, {
                status: "AVAILABLE",
            });
        }
        // Property lots are now calculated from spots, no need to update manually
        // Delete the user
        yield users_schema_1.Users.findByIdAndDelete(userId);
        return {
            message: "User and all associated assignments have been successfully removed.",
        };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to delete user. Please try again or contact support if the problem persists.");
    }
});
//* Get All Users (Admin only)
const getAllUsers = (adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view all users");
    }
    const users = yield users_schema_1.Users.find({})
        .select("-password")
        .populate({
        path: "propertyId",
        select: "name description address amenities images rules",
    })
        .populate({
        path: "spotId",
        select: "spotNumber status size price description images isActive",
    });
    return users;
});
//* Get All Tenants (Admin only) - with property and spot data
const getAllTenants = (adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view tenants");
    }
    const tenants = yield users_schema_1.Users.find({ role: "TENANT" })
        .select("-password")
        .populate({
        path: "propertyId",
        select: "name description address amenities totalLots availableLots isActive images rules",
    })
        .populate({
        path: "spotId",
        select: "spotNumber status size price description images isActive",
    });
    return tenants;
});
//* Get User by ID (Admin only)
const getUserById = (userId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view user details");
    }
    const user = yield users_schema_1.Users.findById(userId)
        .select("-password")
        .populate({
        path: "propertyId",
        select: "name description address amenities totalLots availableLots isActive images rules",
    })
        .populate({
        path: "spotId",
        select: "spotNumber status size price description images isActive",
    });
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
    getAllTenants,
    getUserById,
    checkUserInvitationStatus,
};
