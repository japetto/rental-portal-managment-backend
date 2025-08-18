"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../../../config/config"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const payment_enums_1 = require("../../../shared/enums/payment.enums");
const spots_schema_1 = require("../spots/spots.schema");
const users_schema_1 = require("./users.schema");
const users_utils_1 = require("./users.utils");
//* User Register Custom
const userRegister = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, phoneNumber } = payload;
    // Check for existing user by email
    const existingUserByEmail = yield users_schema_1.Users.findOne({ email });
    if (existingUserByEmail) {
        if (existingUserByEmail.isDeleted) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, `An account with email "${email}" was previously deleted. Please contact administrator to restore your account or use a different email address.`);
        }
        if (!existingUserByEmail.isActive) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, `An account with email "${email}" exists but is currently deactivated. Please contact administrator to reactivate your account.`);
        }
        throw new ApiError_1.default(http_status_1.default.CONFLICT, `An account with email "${email}" already exists. Please use a different email address or try logging in.`);
    }
    // Check for existing user by phone number
    const existingUserByPhone = yield users_schema_1.Users.findOne({ phoneNumber });
    if (existingUserByPhone) {
        if (existingUserByPhone.isDeleted) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, `An account with phone number "${phoneNumber}" was previously deleted. Please contact administrator to restore your account or use a different phone number.`);
        }
        if (!existingUserByPhone.isActive) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, `An account with phone number "${phoneNumber}" exists but is currently deactivated. Please contact administrator to reactivate your account.`);
        }
        throw new ApiError_1.default(http_status_1.default.CONFLICT, `An account with phone number "${phoneNumber}" already exists. Please use a different phone number or try logging in.`);
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
    // Check if user is deleted or archived
    if (isExists.isDeleted || !isExists.isActive) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Account has been deactivated or deleted. Please contact administrator.");
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
    // Check if user is deleted or archived
    if (user.isDeleted || !user.isActive) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Account has been deactivated or deleted. Cannot set password.");
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
            if (existingUser.isDeleted) {
                throw new ApiError_1.default(http_status_1.default.CONFLICT, `Phone number "${payload.phoneNumber}" belongs to a deleted account. Please use a different phone number or contact administrator to restore the deleted account.`);
            }
            if (!existingUser.isActive) {
                throw new ApiError_1.default(http_status_1.default.CONFLICT, `Phone number "${payload.phoneNumber}" belongs to a deactivated account. Please use a different phone number or contact administrator to reactivate the account.`);
            }
            throw new ApiError_1.default(http_status_1.default.CONFLICT, `Phone number "${payload.phoneNumber}" is already in use by another tenant. Please use a different phone number.`);
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
//* Update Tenant Data (Admin only)
const updateTenantData = (userId, payload, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // Check if the admin is trying to update themselves
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can update tenant information");
    }
    // Start a database transaction
    const session = yield users_schema_1.Users.startSession();
    session.startTransaction();
    try {
        let updatedUser = user;
        let updatedLease = null;
        // 1. Update user information if provided
        if (payload.user) {
            const userUpdateData = {};
            if (payload.user.name)
                userUpdateData.name = payload.user.name;
            if (payload.user.phoneNumber)
                userUpdateData.phoneNumber = payload.user.phoneNumber;
            if (payload.user.email)
                userUpdateData.email = payload.user.email;
            if (payload.user.rvInfo) {
                // Filter out invalid values for rvInfo
                const filteredRvInfo = {};
                if (payload.user.rvInfo.make)
                    filteredRvInfo.make = payload.user.rvInfo.make;
                if (payload.user.rvInfo.model)
                    filteredRvInfo.model = payload.user.rvInfo.model;
                if (payload.user.rvInfo.licensePlate)
                    filteredRvInfo.licensePlate = payload.user.rvInfo.licensePlate;
                // Only include year and length if they are valid (greater than minimum values)
                if (payload.user.rvInfo.year !== undefined &&
                    payload.user.rvInfo.year !== null &&
                    payload.user.rvInfo.year >= 1900) {
                    filteredRvInfo.year = payload.user.rvInfo.year;
                }
                if (payload.user.rvInfo.length !== undefined &&
                    payload.user.rvInfo.length !== null &&
                    payload.user.rvInfo.length >= 1) {
                    filteredRvInfo.length = payload.user.rvInfo.length;
                }
                // Only set rvInfo if it has valid data
                if (Object.keys(filteredRvInfo).length > 0) {
                    userUpdateData.rvInfo = filteredRvInfo;
                }
            }
            // Check for phone number uniqueness if being updated
            if (payload.user.phoneNumber &&
                payload.user.phoneNumber !== user.phoneNumber) {
                const existingUser = yield users_schema_1.Users.findOne({
                    phoneNumber: payload.user.phoneNumber,
                    _id: { $ne: userId },
                });
                if (existingUser) {
                    throw new ApiError_1.default(http_status_1.default.CONFLICT, `Phone number "${payload.user.phoneNumber}" is already in use by another tenant.`);
                }
            }
            // Check for email uniqueness if being updated
            if (payload.user.email && payload.user.email !== user.email) {
                const existingUser = yield users_schema_1.Users.findOne({
                    email: payload.user.email,
                    _id: { $ne: userId },
                });
                if (existingUser) {
                    throw new ApiError_1.default(http_status_1.default.CONFLICT, `Email "${payload.user.email}" is already in use by another tenant.`);
                }
            }
            const result = yield users_schema_1.Users.findByIdAndUpdate(userId, userUpdateData, {
                new: true,
                runValidators: true,
                session,
            });
            if (!result) {
                throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to update user");
            }
            updatedUser = result;
        }
        // 2. Update lease if provided
        if (payload.lease) {
            const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
            console.log("🔍 User leaseId:", user.leaseId);
            if (user.leaseId) {
                // Update existing lease
                console.log("📝 Updating existing lease...");
                // First check if the lease actually exists
                const existingLease = yield Leases.findById(user.leaseId);
                if (!existingLease) {
                    console.log("⚠️ Lease not found, creating new lease instead...");
                    // If lease doesn't exist, create a new one
                    const newLeaseData = Object.assign(Object.assign({}, payload.lease), { tenantId: userId, propertyId: user.propertyId, spotId: user.spotId, 
                        // Add default values for required fields
                        leaseStart: payload.lease.leaseStart || new Date(), occupants: payload.lease.occupants || 1, rentAmount: payload.lease.rentAmount || 0, depositAmount: payload.lease.depositAmount || 0, leaseStatus: payment_enums_1.LeaseStatus.ACTIVE, pets: {
                            hasPets: ((_a = payload.lease.pets) === null || _a === void 0 ? void 0 : _a.hasPets) || false,
                            petDetails: ((_b = payload.lease.pets) === null || _b === void 0 ? void 0 : _b.petDetails) || [],
                        } });
                    updatedLease = yield Leases.create([newLeaseData], { session });
                    updatedLease = updatedLease[0];
                    // Update user's leaseId
                    yield users_schema_1.Users.findByIdAndUpdate(userId, { leaseId: updatedLease._id }, { session });
                }
                else {
                    // Convert date strings to Date objects
                    const leaseUpdateData = Object.assign({}, payload.lease);
                    if (leaseUpdateData.leaseStart &&
                        typeof leaseUpdateData.leaseStart === "string") {
                        leaseUpdateData.leaseStart = new Date(leaseUpdateData.leaseStart);
                    }
                    if (leaseUpdateData.leaseEnd &&
                        typeof leaseUpdateData.leaseEnd === "string") {
                        leaseUpdateData.leaseEnd = new Date(leaseUpdateData.leaseEnd);
                    }
                    updatedLease = yield Leases.findByIdAndUpdate(user.leaseId, leaseUpdateData, { new: true, runValidators: true, session });
                    if (!updatedLease) {
                        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Lease not found");
                    }
                }
            }
            else {
                // Create new lease
                console.log("🆕 Creating new lease...");
                const newLeaseData = Object.assign(Object.assign({}, payload.lease), { tenantId: userId, propertyId: user.propertyId, spotId: user.spotId, 
                    // Add default values for required fields
                    leaseStart: payload.lease.leaseStart || new Date(), occupants: payload.lease.occupants || 1, rentAmount: payload.lease.rentAmount || 0, depositAmount: payload.lease.depositAmount || 0, leaseStatus: payment_enums_1.LeaseStatus.ACTIVE, pets: {
                        hasPets: ((_c = payload.lease.pets) === null || _c === void 0 ? void 0 : _c.hasPets) || false,
                        petDetails: ((_d = payload.lease.pets) === null || _d === void 0 ? void 0 : _d.petDetails) || [],
                    } });
                updatedLease = yield Leases.create([newLeaseData], { session });
                updatedLease = updatedLease[0];
                // Update user's leaseId
                yield users_schema_1.Users.findByIdAndUpdate(userId, { leaseId: updatedLease._id }, { session });
            }
            console.log("✅ Lease updated/created:", updatedLease._id);
        }
        // Commit the transaction
        yield session.commitTransaction();
        return {
            user: updatedUser,
            lease: updatedLease,
        };
    }
    catch (error) {
        // Rollback the transaction
        yield session.abortTransaction();
        throw error;
    }
    finally {
        // End the session
        session.endSession();
    }
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
    // Soft delete: Mark user as deleted and update related data
    try {
        // If user has a spot assignment, free up the spot
        if (user.spotId) {
            yield spots_schema_1.Spots.findByIdAndUpdate(user.spotId, {
                status: "AVAILABLE",
            });
        }
        // Soft delete the user
        yield softDelete(users_schema_1.Users, userId, adminId);
        return {
            message: "User has been soft deleted successfully. All associated assignments have been updated.",
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
    const users = yield users_schema_1.Users.find({ isDeleted: false })
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
    const tenants = yield users_schema_1.Users.find({ role: "TENANT", isDeleted: false })
        .select("-password")
        .populate({
        path: "propertyId",
        select: "name description address amenities totalLots availableLots isActive images rules",
    })
        .populate({
        path: "spotId",
        select: "spotNumber status size price description images isActive",
    })
        .populate({
        path: "leaseId",
        select: "leaseType leaseStart leaseEnd rentAmount depositAmount leaseStatus occupants pets specialRequests documents notes",
    });
    return tenants;
});
//* Get User by ID (Admin only)
const getUserById = (userId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view user details");
    }
    const user = yield users_schema_1.Users.findOne({ _id: userId, isDeleted: false })
        .select("-password")
        .populate({
        path: "propertyId",
        select: "name description address amenities totalLots availableLots isActive images rules",
    })
        .populate({
        path: "spotId",
        select: "spotNumber status size price description images isActive",
    })
        .populate({
        path: "leaseId",
        select: "leaseType leaseStart leaseEnd rentAmount depositAmount leaseStatus occupants pets specialRequests documents notes",
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
// Helper function to check if all tenant data is filled up by admin
const isTenantDataComplete = (user, activeLease) => {
    // Check if user is a tenant
    if (user.role !== "TENANT") {
        return false;
    }
    // 1. Check ALL required user fields are filled
    const hasRequiredUserFields = !!(user.name &&
        user.name.trim() !== "" &&
        user.email &&
        user.email.trim() !== "" &&
        user.phoneNumber &&
        user.phoneNumber.trim() !== "" &&
        user.preferredLocation &&
        user.preferredLocation.trim() !== "");
    // 2. Check if tenant is assigned to a property and spot
    const hasPropertyAndSpot = !!(user.propertyId &&
        user.propertyId._id &&
        user.spotId &&
        user.spotId._id);
    // 3. Check if tenant has an active lease with ACTIVE status
    const hasActiveLease = !!activeLease && activeLease.leaseStatus === "ACTIVE";
    // 4. Check if lease information is complete (if lease exists)
    const hasCompleteLeaseInfo = !activeLease ||
        (() => {
            var _a, _b, _c, _d, _e;
            // Check if ALL required lease fields are filled
            const hasRequiredLeaseFields = !!(activeLease.tenantId &&
                activeLease.spotId &&
                activeLease.propertyId &&
                activeLease.leaseType &&
                activeLease.leaseStart &&
                activeLease.occupants &&
                activeLease.occupants > 0);
            // Check lease type specific requirements
            const hasValidLeaseType = (activeLease.leaseType === "FIXED_TERM" && activeLease.leaseEnd) ||
                (activeLease.leaseType === "MONTHLY" && !activeLease.leaseEnd);
            // Check pet information if pets are present
            const hasValidPetInfo = !((_a = activeLease.pets) === null || _a === void 0 ? void 0 : _a.hasPets) ||
                (((_b = activeLease.pets) === null || _b === void 0 ? void 0 : _b.hasPets) &&
                    ((_c = activeLease.pets) === null || _c === void 0 ? void 0 : _c.petDetails) &&
                    ((_d = activeLease.pets) === null || _d === void 0 ? void 0 : _d.petDetails.length) > 0 &&
                    ((_e = activeLease.pets) === null || _e === void 0 ? void 0 : _e.petDetails.every((pet) => pet.type && pet.breed && pet.name)));
            // Check ALL financial fields are properly set
            const hasValidFinancials = typeof activeLease.rentAmount === "number" &&
                activeLease.rentAmount > 0 &&
                typeof activeLease.depositAmount === "number" &&
                activeLease.depositAmount >= 0 &&
                (activeLease.additionalRentAmount === undefined ||
                    activeLease.additionalRentAmount === null ||
                    (typeof activeLease.additionalRentAmount === "number" &&
                        activeLease.additionalRentAmount >= 0));
            // Check if lease dates are valid
            const hasValidDates = activeLease.leaseStart &&
                new Date(activeLease.leaseStart) > new Date() &&
                (activeLease.leaseType === "MONTHLY" ||
                    (activeLease.leaseType === "FIXED_TERM" &&
                        activeLease.leaseEnd &&
                        new Date(activeLease.leaseEnd) > new Date(activeLease.leaseStart)));
            return (hasRequiredLeaseFields &&
                hasValidLeaseType &&
                hasValidPetInfo &&
                hasValidFinancials &&
                hasValidDates);
        })();
    // 5. Check if RV information is provided (if user has RV)
    const hasRvInfo = !user.rvInfo ||
        !!(user.rvInfo.make &&
            user.rvInfo.make.trim() !== "" &&
            user.rvInfo.model &&
            user.rvInfo.model.trim() !== "" &&
            user.rvInfo.year &&
            user.rvInfo.length &&
            user.rvInfo.licensePlate &&
            user.rvInfo.licensePlate.trim() !== "");
    // 6. Check if emergency contact is provided
    const hasEmergencyContact = !!(user.emergencyContact &&
        user.emergencyContact.name &&
        user.emergencyContact.name.trim() !== "" &&
        user.emergencyContact.phone &&
        user.emergencyContact.phone.trim() !== "" &&
        user.emergencyContact.relationship &&
        user.emergencyContact.relationship.trim() !== "");
    // ALL conditions must be met for tenant status to be true
    return (hasRequiredUserFields &&
        hasPropertyAndSpot &&
        hasActiveLease &&
        hasCompleteLeaseInfo &&
        hasRvInfo &&
        hasEmergencyContact);
};
// Get comprehensive user profile with all related information
const getComprehensiveUserProfile = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const user = yield users_schema_1.Users.findById(userId)
        .populate("propertyId", "name description address amenities images rules")
        .populate("spotId", "spotNumber spotIdentifier status size amenities price description images");
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // Initialize variables with proper types
    let activeLease = null;
    let recentPayments = [];
    let pendingPayments = [];
    let recentServiceRequests = [];
    let unreadAnnouncements = [];
    let assignmentHistory = [];
    let rentSummary = null;
    // Only fetch tenant-specific data if user is a tenant
    if (user.role === "TENANT") {
        // Get user's active lease using direct reference
        const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
        activeLease = user.leaseId
            ? yield Leases.findById(user.leaseId).populate("spotId", "spotNumber spotIdentifier status size amenities price description")
            : yield Leases.findOne({
                tenantId: userId,
                leaseStatus: "ACTIVE",
            }).populate("spotId", "spotNumber spotIdentifier status size amenities price description");
        // Get user's payments (recent and pending)
        const { Payments } = yield Promise.resolve().then(() => __importStar(require("../payments/payments.schema")));
        recentPayments = yield Payments.find({
            tenantId: userId,
            isDeleted: false,
        })
            .populate("propertyId", "name address")
            .populate("spotId", "spotNumber spotIdentifier")
            .sort({ createdAt: -1 })
            .limit(10);
        pendingPayments = yield Payments.find({
            tenantId: userId,
            status: { $in: ["PENDING", "OVERDUE"] },
            isDeleted: false,
        })
            .populate("propertyId", "name address")
            .populate("spotId", "spotNumber spotIdentifier")
            .sort({ dueDate: 1 });
        // Get comprehensive rent summary using PaymentService
        try {
            const { PaymentService } = yield Promise.resolve().then(() => __importStar(require("../payments/payment.service")));
            rentSummary = yield PaymentService.getRentSummary(userId);
        }
        catch (error) {
            console.error("Error getting rent summary:", error);
            rentSummary = null;
        }
        // Get user's service requests
        const { ServiceRequests } = yield Promise.resolve().then(() => __importStar(require("../service-requests/service-requests.schema")));
        recentServiceRequests = yield ServiceRequests.find({
            tenantId: userId,
        })
            .sort({ createdAt: -1 })
            .limit(5);
        // Get user's unread announcements using proper filtering
        const { Announcements } = yield Promise.resolve().then(() => __importStar(require("../announcements/announcements.schema")));
        // Get user's property ID - handle both populated object and ObjectId
        const userPropertyId = ((_b = (_a = user.propertyId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) || ((_c = user.propertyId) === null || _c === void 0 ? void 0 : _c.toString());
        // Build the query for announcements that are relevant to this tenant
        const baseQuery = {
            isDeleted: false, // Only get non-deleted announcements
            isActive: true,
            readBy: { $ne: userId }, // Only unread announcements
        };
        // Build target audience conditions
        const targetAudienceConditions = [
            { targetAudience: "ALL" },
            { targetAudience: "TENANTS_ONLY" },
        ];
        // Include PROPERTY_SPECIFIC announcements for user's property
        if (userPropertyId) {
            targetAudienceConditions.push({
                $and: [
                    { targetAudience: "PROPERTY_SPECIFIC" },
                    { propertyId: userPropertyId },
                ],
            });
        }
        // Combine all conditions
        const query = Object.assign(Object.assign({}, baseQuery), { $or: targetAudienceConditions });
        unreadAnnouncements = yield Announcements.find(query)
            .populate({
            path: "propertyId",
            select: "name description address",
        })
            .sort({ priority: -1, createdAt: -1 });
        // Get user's assignment history
        assignmentHistory = yield getUserAssignmentHistory(userId);
    }
    else if (user.role === "SUPER_ADMIN") {
        // For SUPER_ADMIN, get all announcements (they can see all)
        const { Announcements } = yield Promise.resolve().then(() => __importStar(require("../announcements/announcements.schema")));
        unreadAnnouncements = yield Announcements.find({
            isActive: true,
            targetAudience: { $in: ["ALL", "ADMINS_ONLY"] },
        }).sort({ createdAt: -1 });
    }
    // Calculate payment summary (only for tenants)
    const totalPendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
    const overduePayments = pendingPayments.filter(payment => payment.status === "OVERDUE");
    // Check for active payment links
    const activePaymentLinks = pendingPayments.filter(payment => payment.stripePaymentLinkId && payment.paymentLinkUrl);
    // Get next payment due date
    const nextPaymentDue = pendingPayments.length > 0 ? pendingPayments[0] : null;
    // Check tenant status for tenants
    const tenantStatus = user.role === "TENANT" ? isTenantDataComplete(user, activeLease) : null;
    console.log(`🔍 User profile for: ${user.name} (${user.role})`);
    if (user.role === "TENANT") {
        console.log(`   - Tenant Status: ${tenantStatus}`);
        console.log(`   - Has property: ${!!user.propertyId}`);
        console.log(`   - Has spot: ${!!user.spotId}`);
        console.log(`   - Has lease: ${!!activeLease}`);
        if (activeLease) {
            console.log(`   - Lease type: ${activeLease.leaseType}`);
            console.log(`   - Lease status: ${activeLease.leaseStatus}`);
            console.log(`   - Rent amount: ${activeLease.rentAmount}`);
            console.log(`   - Deposit amount: ${activeLease.depositAmount}`);
        }
        console.log(`   - Has RV info: ${!!user.rvInfo}`);
        console.log(`   - Has emergency contact: ${!!user.emergencyContact}`);
    }
    // Build comprehensive profile
    const comprehensiveProfile = {
        // Basic user info
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profileImage: user.profileImage,
            bio: user.bio,
            preferredLocation: user.preferredLocation,
            isVerified: user.isVerified,
            isInvited: user.isInvited,
            rvInfo: user.rvInfo,
            emergencyContact: user.emergencyContact,
        },
        // Tenant status (only for tenants)
        tenantStatus: tenantStatus,
        // Property information (only for tenants)
        property: user.role === "TENANT" ? user.propertyId : null,
        // Spot information (only for tenants)
        spot: user.role === "TENANT" ? user.spotId : null,
        // Lease information (only for tenants)
        lease: user.role === "TENANT" && activeLease
            ? {
                _id: activeLease._id,
                leaseStart: activeLease.leaseStart,
                leaseEnd: activeLease.leaseEnd,
                rentAmount: activeLease.totalRentAmount, // Use total rent amount (base + additional)
                depositAmount: activeLease.depositAmount,
                paymentStatus: activeLease.paymentStatus,
                leaseStatus: activeLease.leaseStatus,
                occupants: activeLease.occupants,
                rvInfo: activeLease.rvInfo,
                specialRequests: activeLease.specialRequests,
                documents: activeLease.documents,
                notes: activeLease.notes,
                durationDays: activeLease.durationDays,
                isLeaseActive: activeLease.isLeaseActive,
            }
            : null,
        // Enhanced rent and payment information (only for tenants)
        rent: user.role === "TENANT"
            ? {
                // Current rent amount from lease (total amount)
                currentRentAmount: (activeLease === null || activeLease === void 0 ? void 0 : activeLease.totalRentAmount) || 0,
                depositAmount: (activeLease === null || activeLease === void 0 ? void 0 : activeLease.depositAmount) || 0,
                // Due date information
                dueDates: {
                    currentMonthDueDate: (rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.currentMonthDueDate) || null,
                    nextMonthDueDate: (rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.nextMonthDueDate) || null,
                    // Get the earliest overdue due date
                    earliestOverdueDate: ((_e = (_d = rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.overduePaymentsDetails) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.dueDate) || null,
                    // Get all overdue due dates
                    overdueDueDates: ((_f = rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.overduePaymentsDetails) === null || _f === void 0 ? void 0 : _f.map((payment) => payment.dueDate)) || [],
                    // Get next payment due date (current month or earliest overdue)
                    nextPaymentDueDate: (rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.currentMonthDueDate) ||
                        ((_h = (_g = rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.overduePaymentsDetails) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.dueDate) ||
                        null,
                },
                // Rent summary with due dates and status
                summary: rentSummary
                    ? {
                        hasActiveLease: rentSummary.hasActiveLease,
                        isFirstTimePayment: rentSummary.isFirstTimePayment,
                        currentMonthAmount: rentSummary.currentMonthAmount,
                        currentMonthDescription: rentSummary.currentMonthDescription,
                        totalOverdueAmount: rentSummary.totalOverdueAmount,
                        totalDue: rentSummary.totalDue,
                        currentMonthDueDate: rentSummary.currentMonthDueDate,
                        nextMonthDueDate: rentSummary.nextMonthDueDate,
                        overduePaymentsDetails: rentSummary.overduePaymentsDetails,
                        paymentAction: rentSummary.paymentAction,
                        canPayNextMonth: rentSummary.canPayNextMonth,
                        warningMessage: rentSummary.warningMessage,
                        hasOverduePayments: rentSummary.hasOverduePayments,
                        overdueCount: rentSummary.overdueCount,
                        leaseExpirationWarning: rentSummary.leaseExpirationWarning,
                    }
                    : null,
                // Payment options from rent summary
                paymentOptions: (rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.paymentOptions) || [],
                // Pro-rated payment details
                isProRated: (rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.isProRated) || false,
                proRatedDays: (rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.proRatedDays) || 0,
                proRatedRentAmount: (rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.proRatedRentAmount) || 0,
                fullMonthRentAmount: (rentSummary === null || rentSummary === void 0 ? void 0 : rentSummary.fullMonthRentAmount) || 0,
            }
            : null,
        // Payment information (only for tenants)
        payments: {
            recent: recentPayments.map(payment => (Object.assign(Object.assign({}, payment.toObject()), { status: payment.status, isOverdue: payment.status === "OVERDUE", isPending: payment.status === "PENDING", isPaid: payment.status === "PAID" }))),
            pending: pendingPayments.map(payment => (Object.assign(Object.assign({}, payment.toObject()), { status: payment.status, isOverdue: payment.status === "OVERDUE", isPending: payment.status === "PENDING", isPaid: payment.status === "PAID" }))),
            activePaymentLinks: activePaymentLinks.map(payment => (Object.assign(Object.assign({}, payment.toObject()), { status: payment.status, isOverdue: payment.status === "OVERDUE", isPending: payment.status === "PENDING", isPaid: payment.status === "PAID" }))),
            summary: {
                totalPendingAmount,
                overdueCount: overduePayments.length,
                totalOverdueAmount: overduePayments.reduce((sum, payment) => sum + payment.totalAmount, 0),
                hasActivePaymentLinks: activePaymentLinks.length > 0,
                activePaymentLinksCount: activePaymentLinks.length,
                nextPaymentDue: nextPaymentDue
                    ? {
                        dueDate: nextPaymentDue.dueDate,
                        amount: nextPaymentDue.totalAmount,
                        description: nextPaymentDue.description,
                        hasPaymentLink: !!nextPaymentDue.stripePaymentLinkId,
                    }
                    : null,
                paymentStatus: {
                    hasOverduePayments: overduePayments.length > 0,
                    hasPendingPayments: pendingPayments.length > 0,
                    isUpToDate: pendingPayments.length === 0,
                },
            },
        },
        // Service requests (only for tenants)
        serviceRequests: {
            recent: recentServiceRequests,
            count: user.role === "TENANT"
                ? yield (yield Promise.resolve().then(() => __importStar(require("../service-requests/service-requests.schema")))).ServiceRequests.countDocuments({ tenantId: userId })
                : 0,
        },
        // Announcements
        announcements: {
            unread: unreadAnnouncements,
            unreadCount: unreadAnnouncements.length,
        },
        // Assignment History (only for tenants)
        assignmentHistory: assignmentHistory,
    };
    return comprehensiveProfile;
});
// Track user property and spot assignment history
const trackUserAssignment = (userId, propertyId, spotId, leaseId, reason) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // If this is a new assignment, close any previous active assignment
    if (reason === "LEASE_START" || reason === "TRANSFER") {
        if (user.userHistory && user.userHistory.length > 0) {
            const lastActiveAssignment = user.userHistory.find(history => !history.removedAt);
            if (lastActiveAssignment) {
                lastActiveAssignment.removedAt = new Date();
                lastActiveAssignment.reason =
                    reason === "LEASE_START" ? "LEASE_END" : "TRANSFER";
            }
        }
    }
    // Add new assignment to history
    const newAssignment = {
        propertyId: new mongoose_1.default.Types.ObjectId(propertyId),
        spotId: new mongoose_1.default.Types.ObjectId(spotId),
        leaseId: new mongoose_1.default.Types.ObjectId(leaseId),
        assignedAt: new Date(),
        removedAt: reason === "LEASE_END" || reason === "CANCELLATION"
            ? new Date()
            : undefined,
        reason,
    };
    // Update user's current assignment and history
    const updateData = {
        propertyId: new mongoose_1.default.Types.ObjectId(propertyId),
        spotId: new mongoose_1.default.Types.ObjectId(spotId),
        leaseId: new mongoose_1.default.Types.ObjectId(leaseId),
        $push: { userHistory: newAssignment },
    };
    // If ending assignment, clear current references
    if (reason === "LEASE_END" || reason === "CANCELLATION") {
        updateData.propertyId = null;
        updateData.spotId = null;
        updateData.leaseId = null;
    }
    const updatedUser = yield users_schema_1.Users.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
    });
    return updatedUser;
});
// Get user's complete assignment history
const getUserAssignmentHistory = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield users_schema_1.Users.findById(userId)
        .populate("userHistory.propertyId", "name address")
        .populate("userHistory.spotId", "spotNumber spotIdentifier")
        .populate("userHistory.leaseId", "leaseStart leaseEnd rentAmount");
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    return user.userHistory || [];
});
// Utility function for soft delete
const softDelete = (model, id, deletedBy) => __awaiter(void 0, void 0, void 0, function* () {
    const updateData = {
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
    };
    // Add deletedBy if provided
    if (deletedBy) {
        updateData.deletedBy = deletedBy;
    }
    const result = yield model.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });
    if (!result) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Record not found");
    }
    return result;
});
// Utility function to restore soft deleted record
const restoreRecord = (model, id, restoredBy) => __awaiter(void 0, void 0, void 0, function* () {
    const updateData = {
        isActive: true,
        isDeleted: false,
        deletedAt: null,
    };
    // Add restoredBy if provided
    if (restoredBy) {
        updateData.restoredBy = restoredBy;
    }
    const result = yield model.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });
    if (!result) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Record not found");
    }
    return result;
});
// Utility function to get only active records
const getActiveRecords = (model_1, ...args_1) => __awaiter(void 0, [model_1, ...args_1], void 0, function* (model, query = {}) {
    return yield model.find(Object.assign(Object.assign({}, query), { isDeleted: false }));
});
// Utility function to get deleted records
const getDeletedRecords = (model_1, ...args_1) => __awaiter(void 0, [model_1, ...args_1], void 0, function* (model, query = {}) {
    return yield model.find(Object.assign(Object.assign({}, query), { isDeleted: true }));
});
exports.UserService = {
    userRegister,
    userLogin,
    setPassword,
    updateUserInfo,
    updateTenantData,
    deleteUser,
    getAllUsers,
    getAllTenants,
    getUserById,
    checkUserInvitationStatus,
    getComprehensiveUserProfile,
    trackUserAssignment,
    getUserAssignmentHistory,
    softDelete,
    restoreRecord,
    getActiveRecords,
    getDeletedRecords,
};
