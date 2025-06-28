import bcrypt from "bcrypt";
import httpStatus from "http-status";
import config from "../../../config/config";
import ApiError from "../../../errors/ApiError";
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
  const { email, password } = payload;

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
    throw new ApiError(httpStatus.FORBIDDEN, "Cannot delete your own account");
  }

  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can delete users",
    );
  }

  const user = await Users.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Check if user has active leases or other dependencies
  // You might want to add additional checks here based on your business logic
  if (user.propertyId || user.spotId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete user with active property or spot assignments. Please remove assignments first.",
    );
  }

  await Users.findByIdAndDelete(userId);

  return {
    message: "User deleted successfully",
  };
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

  const users = await Users.find({})
    .select("-password")
    .populate({
      path: "propertyId",
      select:
        "name description address amenities totalLots availableLots isActive images rules",
    })
    .populate({
      path: "spotId",
      select:
        "spotNumber status size amenities hookups price description images isActive",
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

  const tenants = await Users.find({ role: "TENANT" })
    .select("-password")
    .populate({
      path: "propertyId",
      select:
        "name description address amenities totalLots availableLots isActive images rules",
    })
    .populate({
      path: "spotId",
      select:
        "spotNumber status size amenities hookups price description images isActive",
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
      select:
        "spotNumber status size amenities hookups price description images isActive",
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
};
