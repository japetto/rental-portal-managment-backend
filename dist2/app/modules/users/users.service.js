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
    if (user.isDeleted) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User has been deleted");
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
// Get comprehensive user profile with all related information
const getComprehensiveUserProfile = (userId) => __awaiter(void 0, void 0, void 0, function* () {
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
        })
            .sort({ createdAt: -1 })
            .limit(10);
        pendingPayments = yield Payments.find({
            tenantId: userId,
            status: { $in: ["PENDING", "OVERDUE"] },
        }).sort({ dueDate: 1 });
        // Get user's service requests
        const { ServiceRequests } = yield Promise.resolve().then(() => __importStar(require("../service-requests/service-requests.schema")));
        recentServiceRequests = yield ServiceRequests.find({
            tenantId: userId,
        })
            .sort({ createdAt: -1 })
            .limit(5);
        // Get user's unread announcements
        const { Announcements } = yield Promise.resolve().then(() => __importStar(require("../announcements/announcements.schema")));
        unreadAnnouncements = yield Announcements.find({
            propertyId: user.propertyId,
            isActive: true,
            readBy: { $ne: userId },
        }).sort({ createdAt: -1 });
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
        },
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
                rentAmount: activeLease.rentAmount,
                depositAmount: activeLease.depositAmount,
                paymentStatus: activeLease.paymentStatus,
                leaseStatus: activeLease.leaseStatus,
                occupants: activeLease.occupants,
                rvInfo: activeLease.rvInfo,
                emergencyContact: activeLease.emergencyContact,
                specialRequests: activeLease.specialRequests,
                documents: activeLease.documents,
                notes: activeLease.notes,
                durationDays: activeLease.durationDays,
                isLeaseActive: activeLease.isLeaseActive,
            }
            : null,
        // Payment information (only for tenants)
        payments: {
            recent: recentPayments,
            pending: pendingPayments,
            summary: {
                totalPendingAmount,
                overdueCount: overduePayments.length,
                totalOverdueAmount: overduePayments.reduce((sum, payment) => sum + payment.totalAmount, 0),
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
