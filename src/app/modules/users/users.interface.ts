import { Document, Types } from "mongoose";

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export type userRoleEnums = "SUPER_ADMIN" | "TENANT";

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  role: userRoleEnums;
  isInvited?: boolean;
  isVerified?: boolean;
  profileImage?: string;
  bio?: string;
  phoneNumber: string;
  preferredLocation: string;
  // Tenant-specific fields (only for TENANT role)
  propertyId?: Types.ObjectId; // Which property the tenant belongs to
  spotId?: Types.ObjectId; // Which spot the tenant is assigned to
  leaseId?: Types.ObjectId; // Reference to active lease
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  // History tracking for property and spot assignments
  userHistory?: Array<{
    propertyId: Types.ObjectId;
    spotId: Types.ObjectId;
    leaseId: Types.ObjectId;
    assignedAt: Date;
    removedAt?: Date;
    reason: string; // "LEASE_START", "LEASE_END", "TRANSFER", "CANCELLATION"
  }>;
  comparePassword(candidate: string): Promise<boolean>;
  // Virtual properties
  activeLease?: any;
  pendingPaymentsCount?: number;
}

export interface ICheckUserExists {
  email: string;
}

export interface IUserWithoutPassword {
  _id: string;
  email: string;
  name: string;
  role: userRoleEnums;
  isVerified: boolean;
  profileImage?: string;
  bio?: string;
  phoneNumber: string;
  preferredLocation: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthUser {
  token: string;
  userData: string;
}

export interface ILoginUser {
  email: string;
  password: string;
}

export interface IUpdatePassword {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IForgetPasswordValidator {
  email: string;
}

export interface IUpdatePasswordValidator {
  email: string;
  password: string;
}

export interface ISetPassword {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface IUpdateUserInfo {
  name?: string;
  phoneNumber?: string;
  preferredLocation?: string;
  bio?: string;
  profileImage?: string;
}

export interface IDeleteUser {
  userId: string;
}
