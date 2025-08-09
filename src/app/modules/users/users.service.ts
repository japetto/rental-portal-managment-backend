import bcrypt from "bcrypt";
import httpStatus from "http-status";
import mongoose from "mongoose";
import config from "../../../config/config";
import ApiError from "../../../errors/ApiError";
import { LeaseStatus } from "../../../shared/enums/payment.enums";
import { Spots } from "../spots/spots.schema";
import {
  IAuthUser,
  ILoginUser,
  ISetPassword,
  IUpdateTenantData,
  IUpdateUserInfo,
  IUser,
} from "./users.interface";
import { Users } from "./users.schema";
import { generateAuthToken } from "./users.utils";

//* User Register Custom
const userRegister = async (payload: IUser): Promise<IAuthUser> => {
  const { email, phoneNumber } = payload;

  // Check for existing user by email
  const existingUserByEmail = await Users.findOne({ email });
  if (existingUserByEmail) {
    if (existingUserByEmail.isDeleted) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `An account with email "${email}" was previously deleted. Please contact administrator to restore your account or use a different email address.`,
      );
    }
    if (!existingUserByEmail.isActive) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `An account with email "${email}" exists but is currently deactivated. Please contact administrator to reactivate your account.`,
      );
    }
    throw new ApiError(
      httpStatus.CONFLICT,
      `An account with email "${email}" already exists. Please use a different email address or try logging in.`,
    );
  }

  // Check for existing user by phone number
  const existingUserByPhone = await Users.findOne({ phoneNumber });
  if (existingUserByPhone) {
    if (existingUserByPhone.isDeleted) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `An account with phone number "${phoneNumber}" was previously deleted. Please contact administrator to restore your account or use a different phone number.`,
      );
    }
    if (!existingUserByPhone.isActive) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `An account with phone number "${phoneNumber}" exists but is currently deactivated. Please contact administrator to reactivate your account.`,
      );
    }
    throw new ApiError(
      httpStatus.CONFLICT,
      `An account with phone number "${phoneNumber}" already exists. Please use a different phone number or try logging in.`,
    );
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

  // Check if user is deleted or archived
  if (isExists.isDeleted || !isExists.isActive) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Account has been deactivated or deleted. Please contact administrator.",
    );
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

  // Check if user is deleted or archived
  if (user.isDeleted || !user.isActive) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Account has been deactivated or deleted. Cannot set password.",
    );
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
      if (existingUser.isDeleted) {
        throw new ApiError(
          httpStatus.CONFLICT,
          `Phone number "${payload.phoneNumber}" belongs to a deleted account. Please use a different phone number or contact administrator to restore the deleted account.`,
        );
      }
      if (!existingUser.isActive) {
        throw new ApiError(
          httpStatus.CONFLICT,
          `Phone number "${payload.phoneNumber}" belongs to a deactivated account. Please use a different phone number or contact administrator to reactivate the account.`,
        );
      }
      throw new ApiError(
        httpStatus.CONFLICT,
        `Phone number "${payload.phoneNumber}" is already in use by another tenant. Please use a different phone number.`,
      );
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

//* Update Tenant Data (Admin only)
const updateTenantData = async (
  userId: string,
  payload: IUpdateTenantData,
  adminId: string,
): Promise<{ user: IUser; lease?: any }> => {
  const user = await Users.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Check if the admin is trying to update themselves
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can update tenant information",
    );
  }

  // Start a database transaction
  const session = await Users.startSession();
  session.startTransaction();

  try {
    let updatedUser: IUser = user!;
    let updatedLease = null;

    // 1. Update user information if provided
    if (payload.user) {
      const userUpdateData: any = {};
      if (payload.user.name) userUpdateData.name = payload.user.name;
      if (payload.user.phoneNumber)
        userUpdateData.phoneNumber = payload.user.phoneNumber;
      if (payload.user.email) userUpdateData.email = payload.user.email;
      if (payload.user.rvInfo) {
        // Filter out invalid values for rvInfo
        const filteredRvInfo: any = {};
        if (payload.user.rvInfo.make)
          filteredRvInfo.make = payload.user.rvInfo.make;
        if (payload.user.rvInfo.model)
          filteredRvInfo.model = payload.user.rvInfo.model;
        if (payload.user.rvInfo.licensePlate)
          filteredRvInfo.licensePlate = payload.user.rvInfo.licensePlate;

        // Only include year and length if they are valid (greater than minimum values)
        if (
          payload.user.rvInfo.year !== undefined &&
          payload.user.rvInfo.year !== null &&
          payload.user.rvInfo.year >= 1900
        ) {
          filteredRvInfo.year = payload.user.rvInfo.year;
        }
        if (
          payload.user.rvInfo.length !== undefined &&
          payload.user.rvInfo.length !== null &&
          payload.user.rvInfo.length >= 1
        ) {
          filteredRvInfo.length = payload.user.rvInfo.length;
        }

        // Only set rvInfo if it has valid data
        if (Object.keys(filteredRvInfo).length > 0) {
          userUpdateData.rvInfo = filteredRvInfo;
        }
      }

      // Check for phone number uniqueness if being updated
      if (
        payload.user.phoneNumber &&
        payload.user.phoneNumber !== user.phoneNumber
      ) {
        const existingUser = await Users.findOne({
          phoneNumber: payload.user.phoneNumber,
          _id: { $ne: userId },
        });
        if (existingUser) {
          throw new ApiError(
            httpStatus.CONFLICT,
            `Phone number "${payload.user.phoneNumber}" is already in use by another tenant.`,
          );
        }
      }

      // Check for email uniqueness if being updated
      if (payload.user.email && payload.user.email !== user.email) {
        const existingUser = await Users.findOne({
          email: payload.user.email,
          _id: { $ne: userId },
        });
        if (existingUser) {
          throw new ApiError(
            httpStatus.CONFLICT,
            `Email "${payload.user.email}" is already in use by another tenant.`,
          );
        }
      }

      const result = await Users.findByIdAndUpdate(userId, userUpdateData, {
        new: true,
        runValidators: true,
        session,
      });

      if (!result) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Failed to update user",
        );
      }

      updatedUser = result;
    }

    // 2. Update lease if provided
    if (payload.lease) {
      const { Leases } = await import("../leases/leases.schema");

      console.log("🔍 User leaseId:", user.leaseId);

      if (user.leaseId) {
        // Update existing lease
        console.log("📝 Updating existing lease...");

        // First check if the lease actually exists
        const existingLease = await Leases.findById(user.leaseId);
        if (!existingLease) {
          console.log("⚠️ Lease not found, creating new lease instead...");
          // If lease doesn't exist, create a new one
          const newLeaseData = {
            ...payload.lease,
            tenantId: userId,
            propertyId: user.propertyId,
            spotId: user.spotId,
            // Add default values for required fields
            leaseStart: payload.lease.leaseStart || new Date(),
            occupants: payload.lease.occupants || 1,
            rentAmount: payload.lease.rentAmount || 0,
            depositAmount: payload.lease.depositAmount || 0,
            leaseStatus: LeaseStatus.ACTIVE, // Explicitly set lease status to ACTIVE
            pets: {
              hasPets: payload.lease.pets?.hasPets || false,
              petDetails: payload.lease.pets?.petDetails || [],
            },
          };

          updatedLease = await Leases.create([newLeaseData], { session });
          updatedLease = updatedLease[0];

          // Update user's leaseId
          await Users.findByIdAndUpdate(
            userId,
            { leaseId: updatedLease._id },
            { session },
          );
        } else {
          // Convert date strings to Date objects
          const leaseUpdateData = { ...payload.lease };
          if (
            leaseUpdateData.leaseStart &&
            typeof leaseUpdateData.leaseStart === "string"
          ) {
            leaseUpdateData.leaseStart = new Date(leaseUpdateData.leaseStart);
          }
          if (
            leaseUpdateData.leaseEnd &&
            typeof leaseUpdateData.leaseEnd === "string"
          ) {
            leaseUpdateData.leaseEnd = new Date(leaseUpdateData.leaseEnd);
          }

          updatedLease = await Leases.findByIdAndUpdate(
            user.leaseId,
            leaseUpdateData,
            { new: true, runValidators: true, session }, // Enable validators to trigger pre-save middleware
          );

          if (!updatedLease) {
            throw new ApiError(httpStatus.NOT_FOUND, "Lease not found");
          }
        }
      } else {
        // Create new lease
        console.log("🆕 Creating new lease...");
        const newLeaseData = {
          ...payload.lease,
          tenantId: userId,
          propertyId: user.propertyId,
          spotId: user.spotId,
          // Add default values for required fields
          leaseStart: payload.lease.leaseStart || new Date(),
          occupants: payload.lease.occupants || 1,
          rentAmount: payload.lease.rentAmount || 0,
          depositAmount: payload.lease.depositAmount || 0,
          leaseStatus: LeaseStatus.ACTIVE, // Explicitly set lease status to ACTIVE
          pets: {
            hasPets: payload.lease.pets?.hasPets || false,
            petDetails: payload.lease.pets?.petDetails || [],
          },
        };

        updatedLease = await Leases.create([newLeaseData], { session });
        updatedLease = updatedLease[0];

        // Update user's leaseId
        await Users.findByIdAndUpdate(
          userId,
          { leaseId: updatedLease._id },
          { session },
        );
      }

      console.log("✅ Lease updated/created:", updatedLease._id);
    }

    // Commit the transaction
    await session.commitTransaction();

    return {
      user: updatedUser,
      lease: updatedLease,
    };
  } catch (error) {
    // Rollback the transaction
    await session.abortTransaction();
    throw error;
  } finally {
    // End the session
    session.endSession();
  }
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
    })
    .populate({
      path: "leaseId",
      select:
        "leaseType leaseStart leaseEnd rentAmount depositAmount leaseStatus occupants pets emergencyContact specialRequests documents notes",
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

  const user = await Users.findOne({ _id: userId, isDeleted: false })
    .select("-password")
    .populate({
      path: "propertyId",
      select:
        "name description address amenities totalLots availableLots isActive images rules",
    })
    .populate({
      path: "spotId",
      select: "spotNumber status size price description images isActive",
    })
    .populate({
      path: "leaseId",
      select:
        "leaseType leaseStart leaseEnd rentAmount depositAmount leaseStatus occupants pets emergencyContact specialRequests documents notes",
    });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
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
      isDeleted: false,
    })
      .populate("propertyId", "name address")
      .populate("spotId", "spotNumber spotIdentifier")
      .sort({ createdAt: -1 })
      .limit(10);

    pendingPayments = await Payments.find({
      tenantId: userId,
      status: { $in: ["PENDING", "OVERDUE"] },
      isDeleted: false,
    })
      .populate("propertyId", "name address")
      .populate("spotId", "spotNumber spotIdentifier")
      .sort({ dueDate: 1 });

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

  // Check for active payment links
  const activePaymentLinks = pendingPayments.filter(
    payment => payment.stripePaymentLinkId && payment.paymentLinkUrl,
  );

  // Get next payment due date
  const nextPaymentDue = pendingPayments.length > 0 ? pendingPayments[0] : null;

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
      recent: recentPayments.map(payment => ({
        ...payment.toObject(),
        status: payment.status,
        isOverdue: payment.status === "OVERDUE",
        isPending: payment.status === "PENDING",
        isPaid: payment.status === "PAID",
      })),
      pending: pendingPayments.map(payment => ({
        ...payment.toObject(),
        status: payment.status,
        isOverdue: payment.status === "OVERDUE",
        isPending: payment.status === "PENDING",
        isPaid: payment.status === "PAID",
      })),
      activePaymentLinks: activePaymentLinks.map(payment => ({
        ...payment.toObject(),
        status: payment.status,
        isOverdue: payment.status === "OVERDUE",
        isPending: payment.status === "PENDING",
        isPaid: payment.status === "PAID",
      })),
      summary: {
        totalPendingAmount,
        overdueCount: overduePayments.length,
        totalOverdueAmount: overduePayments.reduce(
          (sum, payment) => sum + payment.totalAmount,
          0,
        ),
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
