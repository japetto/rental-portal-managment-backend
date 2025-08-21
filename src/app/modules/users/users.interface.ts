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
  // RV Information (tenant's personal property)
  rvInfo?: {
    make: string;
    model: string;
    year: number;
    length: number;
    licensePlate: string;
  };
  // Emergency contact information
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
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
  // Stripe customer ID for webhook lookup (kept for backward compatibility)
  stripeCustomerId?: string;
  // Timestamp fields
  createdAt: Date;
  updatedAt: Date;
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

export interface IUpdateEmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface IUpdateTenantData {
  user?: {
    name?: string;
    phoneNumber?: string;
    email?: string;
    rvInfo?: {
      make: string;
      model: string;
      year: number;
      length: number;
      licensePlate: string;
    };
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  lease?: {
    leaseType?: "MONTHLY" | "FIXED_TERM";
    leaseStart?: Date;
    leaseEnd?: Date;
    rentAmount?: number;
    additionalRentAmount?: number;
    depositAmount?: number;
    occupants?: number;
    pets?: {
      hasPets: boolean;
      petDetails?: {
        type: string;
        breed: string;
        name: string;
        weight: number;
      }[];
    };
    specialRequests?: string[];
    documents?: string[];
    notes?: string;
  };
}

export interface IDeleteUser {
  userId: string;
}

// Interface for comprehensive user profile response
export interface IComprehensiveUserProfile {
  user: {
    _id: any; // Using any to match mongoose document _id type
    name: string;
    email: string;
    phoneNumber: string;
    role: userRoleEnums;
    profileImage?: string;
    bio?: string;
    preferredLocation: string;
    isVerified?: boolean;
    isInvited?: boolean;
    rvInfo?: {
      make: string;
      model: string;
      year: number;
      length: number;
      licensePlate: string;
    };
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  tenantStatus?: boolean | null; // true if all tenant data is complete, false if incomplete, null if not a tenant
  property?: any;
  spot?: any;
  lease?: any;
  rent?: any;
  payments?: any;
  serviceRequests?: any;
  announcements?: any;
  assignmentHistory?: any[];
}
