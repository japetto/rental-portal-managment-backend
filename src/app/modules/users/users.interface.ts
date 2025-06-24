import { Document } from "mongoose";

export type userRoleEnums = "SUPER_ADMIN" | "TENANT";

export interface IUser extends Document {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: userRoleEnums;
  isInvited?: boolean;
  isVerified?: boolean;
  profileImage?: string;
  bio?: string;
  profileUrl: string;
  phoneNumber: string;
  preferredLocation: string;
  comparePassword(candidate: string): Promise<boolean>;
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
