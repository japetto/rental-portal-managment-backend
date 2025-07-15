import bcrypt from "bcrypt";
import httpStatus from "http-status";
import mongoose from "mongoose";
import config from "../../../config/config";
import ApiError from "../../../errors/ApiError";
import { Spots } from "../spots/spots.schema";
import {
  IAuthUser,
  ILoginUser,
  ISetPassword,
  IUpdateUserInfo,
  IUser,
} from "./users.interface";
import { Users } from "./users.schema";
import { generateAuthToken } from "./users.utils";

//* User Register Custom
const userRegister = async (payload: IUser): Promise<IAuthUser> => {
  const { email, phoneNumber } = payload;

  const isExistsUser = await Users.findOne({
    $or: [{ email }, { phoneNumber }],
  });
  if (isExistsUser) {
    throw new ApiError(httpStatus.CONFLICT, "Email or Contact Already Exists");
  }

  // For regular user registration, set appropriate flags
  const userData = {
    ...payload,
    isInvited: false,
    isVerified: true, // Regular users are verified by default
  };

  const user = await Users.create(userData);

  return generateAuthToken(user as any);
};

//* User Login Custom
const userLogin = async (payload: ILoginUser): Promise<IAuthUser> => {
  const { email, password } = payload;

  const isExists = await Users.findOne({ email: email }).select("+password");

  if (!isExists) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid Email Or Password");
  }

  // Check if user is invited but hasn't set password yet
  if (isExists.isInvited && (!isExists.password || isExists.password === "")) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Please set your password first. Use the set-password endpoint.",
    );
  }

  // Check if user has a password (for invited users who haven't set password)
  if (!isExists.password || isExists.password === "") {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Please set your password first. Use the set-password endpoint.",
    );
  }

  // Check if user is verified (only for non-invited users)
  if (!isExists.isInvited && !isExists.isVerified) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Account not verified. Please contact administrator.",
    );
  }

  const checkPassword = await bcrypt.compare(password, isExists.password);

  if (!checkPassword) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid Email Or Password");
  }

  return generateAuthToken(isExists as any);
};

//* Set Password for Invited Users
const setPassword = async (
  payload: ISetPassword,
): Promise<{ message: string }> => {
  const { email, password, confirmPassword } = payload;

  // Validate password confirmation
  if (password !== confirmPassword) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Password and confirm password do not match",
    );
  }

  const user = await Users.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.isInvited) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User is not invited. Cannot set password.",
    );
  }

  if (user.password && user.password !== "") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Password already set. Use update password instead.",
    );
  }

  const hashedPassword = await bcrypt.hash(password, Number(config.salt_round));

  await Users.findOneAndUpdate(
    { email },
    {
      password: hashedPassword,
      isInvited: false,
      isVerified: true,
    },
    { new: true },
  );

  return {
    message: "Password set successfully. You can now login.",
  };
};

//* Update User Info (Admin only)
const updateUserInfo = async (
  userId: string,
  payload: IUpdateUserInfo,
  adminId: string,
): Promise<IUser> => {
  const user = await Users.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Check if the admin is trying to update themselves
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can update user information",
    );
  }

  // Check for phone number uniqueness if being updated
  if (payload.phoneNumber && payload.phoneNumber !== user.phoneNumber) {
    const existingUser = await Users.findOne({
      phoneNumber: payload.phoneNumber,
    });
    if (existingUser) {
      throw new ApiError(httpStatus.CONFLICT, "Phone number already exists");
    }
  }

  const updatedUser = await Users.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update user",
    );
  }

  return updatedUser;
};

//* Delete User (Super Admin only, cannot delete self)
const deleteUser = async (
  userId: string,
  adminId: string,
): Promise<{ message: string }> => {
  // Prevent admin from deleting themselves
  if (userId === adminId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot delete your own account. Please contact another administrator.",
    );
  }

  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Access denied. Only super administrators can delete users.",
    );
  }

  const user = await Users.findById(userId);
  if (!user) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "User not found. The user may have already been deleted.",
    );
  }

  // Soft delete: Mark user as deleted and update related data
  try {
    // If user has a spot assignment, free up the spot
    if (user.spotId) {
      await Spots.findByIdAndUpdate(user.spotId, {
        status: "AVAILABLE",
      });
    }

    // Soft delete the user
    await softDelete(Users, userId, adminId);

    return {
      message:
        "User has been soft deleted successfully. All associated assignments have been updated.",
    };
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to delete user. Please try again or contact support if the problem persists.",
    );
  }
};

//* Get All Users (Admin only)
const getAllUsers = async (adminId: string): Promise<IUser[]> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can view all users",
    );
  }

  const users = await Users.find({ isDeleted: false })
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
};

//* Get All Tenants (Admin only) - with property and spot data
const getAllTenants = async (adminId: string): Promise<IUser[]> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can view tenants",
    );
  }

  const tenants = await Users.find({ role: "TENANT", isDeleted: false })
    .select("-password")
    .populate({
      path: "propertyId",
      select:
        "name description address amenities totalLots availableLots isActive images rules",
    })
    .populate({
      path: "spotId",
      select: "spotNumber status size price description images isActive",
    });

  return tenants;
};

//* Get User by ID (Admin only)
const getUserById = async (userId: string, adminId: string): Promise<IUser> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can view user details",
    );
  }

  const user = await Users.findById(userId)
    .select("-password")
    .populate({
      path: "propertyId",
      select:
        "name description address amenities totalLots availableLots isActive images rules",
    })
    .populate({
      path: "spotId",
      select: "spotNumber status size price description images isActive",
    });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, "User has been deleted");
  }

  return user;
};

//* Check User Invitation Status
const checkUserInvitationStatus = async (
  email: string,
): Promise<{
  isInvited: boolean;
  isVerified: boolean;
  hasPassword: boolean;
}> => {
  const user = await Users.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return {
    isInvited: user.isInvited || false,
    isVerified: user.isVerified || false,
    hasPassword: !!(user.password && user.password !== ""),
  };
};

// Get comprehensive user profile with all related information
const getComprehensiveUserProfile = async (userId: string) => {
  const user = await Users.findById(userId)
    .populate("propertyId", "name description address amenities images rules")
    .populate(
      "spotId",
      "spotNumber spotIdentifier status size amenities price description images",
    );

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Initialize variables with proper types
  let activeLease: any = null;
  let recentPayments: any[] = [];
  let pendingPayments: any[] = [];
  let recentServiceRequests: any[] = [];
  let unreadAnnouncements: any[] = [];
  let assignmentHistory: any[] = [];

  // Only fetch tenant-specific data if user is a tenant
  if (user.role === "TENANT") {
    // Get user's active lease using direct reference
    const { Leases } = await import("../leases/leases.schema");
    activeLease = user.leaseId
      ? await Leases.findById(user.leaseId).populate(
          "spotId",
          "spotNumber spotIdentifier status size amenities price description",
        )
      : await Leases.findOne({
          tenantId: userId,
          leaseStatus: "ACTIVE",
        }).populate(
          "spotId",
          "spotNumber spotIdentifier status size amenities price description",
        );

    // Get user's payments (recent and pending)
    const { Payments } = await import("../payments/payments.schema");
    recentPayments = await Payments.find({
      tenantId: userId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    pendingPayments = await Payments.find({
      tenantId: userId,
      status: { $in: ["PENDING", "OVERDUE"] },
    }).sort({ dueDate: 1 });

    // Get user's service requests
    const { ServiceRequests } = await import(
      "../service-requests/service-requests.schema"
    );
    recentServiceRequests = await ServiceRequests.find({
      tenantId: userId,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get user's unread announcements
    const { Announcements } = await import(
      "../announcements/announcements.schema"
    );
    unreadAnnouncements = await Announcements.find({
      propertyId: user.propertyId,
      isActive: true,
      readBy: { $ne: userId },
    }).sort({ createdAt: -1 });

    // Get user's assignment history
    assignmentHistory = await getUserAssignmentHistory(userId);
  } else if (user.role === "SUPER_ADMIN") {
    // For SUPER_ADMIN, get all announcements (they can see all)
    const { Announcements } = await import(
      "../announcements/announcements.schema"
    );
    unreadAnnouncements = await Announcements.find({
      isActive: true,
      targetAudience: { $in: ["ALL", "ADMINS_ONLY"] },
    }).sort({ createdAt: -1 });
  }

  // Calculate payment summary (only for tenants)
  const totalPendingAmount = pendingPayments.reduce(
    (sum, payment) => sum + payment.totalAmount,
    0,
  );
  const overduePayments = pendingPayments.filter(
    payment => payment.status === "OVERDUE",
  );

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
    lease:
      user.role === "TENANT" && activeLease
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
        totalOverdueAmount: overduePayments.reduce(
          (sum, payment) => sum + payment.totalAmount,
          0,
        ),
      },
    },
    // Service requests (only for tenants)
    serviceRequests: {
      recent: recentServiceRequests,
      count:
        user.role === "TENANT"
          ? await (
              await import("../service-requests/service-requests.schema")
            ).ServiceRequests.countDocuments({ tenantId: userId })
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
};

// Track user property and spot assignment history
const trackUserAssignment = async (
  userId: string,
  propertyId: string,
  spotId: string,
  leaseId: string,
  reason: "LEASE_START" | "LEASE_END" | "TRANSFER" | "CANCELLATION",
) => {
  const user = await Users.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // If this is a new assignment, close any previous active assignment
  if (reason === "LEASE_START" || reason === "TRANSFER") {
    if (user.userHistory && user.userHistory.length > 0) {
      const lastActiveAssignment = user.userHistory.find(
        history => !history.removedAt,
      );
      if (lastActiveAssignment) {
        lastActiveAssignment.removedAt = new Date();
        lastActiveAssignment.reason =
          reason === "LEASE_START" ? "LEASE_END" : "TRANSFER";
      }
    }
  }

  // Add new assignment to history
  const newAssignment = {
    propertyId: new mongoose.Types.ObjectId(propertyId),
    spotId: new mongoose.Types.ObjectId(spotId),
    leaseId: new mongoose.Types.ObjectId(leaseId),
    assignedAt: new Date(),
    removedAt:
      reason === "LEASE_END" || reason === "CANCELLATION"
        ? new Date()
        : undefined,
    reason,
  };

  // Update user's current assignment and history
  const updateData: any = {
    propertyId: new mongoose.Types.ObjectId(propertyId),
    spotId: new mongoose.Types.ObjectId(spotId),
    leaseId: new mongoose.Types.ObjectId(leaseId),
    $push: { userHistory: newAssignment },
  };

  // If ending assignment, clear current references
  if (reason === "LEASE_END" || reason === "CANCELLATION") {
    updateData.propertyId = null;
    updateData.spotId = null;
    updateData.leaseId = null;
  }

  const updatedUser = await Users.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  return updatedUser;
};

// Get user's complete assignment history
const getUserAssignmentHistory = async (userId: string) => {
  const user = await Users.findById(userId)
    .populate("userHistory.propertyId", "name address")
    .populate("userHistory.spotId", "spotNumber spotIdentifier")
    .populate("userHistory.leaseId", "leaseStart leaseEnd rentAmount");

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return user.userHistory || [];
};

// Utility function for soft delete
const softDelete = async (model: any, id: string, deletedBy?: string) => {
  const updateData: any = {
    isActive: false,
    isDeleted: true,
    deletedAt: new Date(),
  };

  // Add deletedBy if provided
  if (deletedBy) {
    updateData.deletedBy = deletedBy;
  }

  const result = await model.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Record not found");
  }

  return result;
};

// Utility function to restore soft deleted record
const restoreRecord = async (model: any, id: string, restoredBy?: string) => {
  const updateData: any = {
    isActive: true,
    isDeleted: false,
    deletedAt: null,
  };

  // Add restoredBy if provided
  if (restoredBy) {
    updateData.restoredBy = restoredBy;
  }

  const result = await model.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Record not found");
  }

  return result;
};

// Utility function to get only active records
const getActiveRecords = async (model: any, query: any = {}) => {
  return await model.find({
    ...query,
    isDeleted: false,
  });
};

// Utility function to get deleted records
const getDeletedRecords = async (model: any, query: any = {}) => {
  return await model.find({
    ...query,
    isDeleted: true,
  });
};

export const UserService = {
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
