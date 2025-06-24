export type userRoleEnums = "hotelOwner" | "customer";
export type linkedProvidersEnums = "CUSTOM" | "FACEBOOK" | "TWITTER" | "GOOGLE";
export type genderEnums = "MALE" | "FEMALE";

export interface IUser {
  userName: string;
  email: string;
  contactNumber: string;
  password: string;
  profileImage: string;
  role: userRoleEnums;
  uid: string;
  linkedProviders: Array<linkedProvidersEnums>;
  location: {
    street: string;
    city: string;
    district: string;
    country: string;
  };
  socialLinks: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
  };
  gender?: genderEnums;
  dateOfBirth: {
    date: string;
    month: string;
    year: string;
  };
}

export interface ICheckUserExists {
  authMethod: linkedProvidersEnums;
  email: string;
}

export interface IUserWithoutPassword {
  _id: string;
  userName: string;
  email: string;
  contactNumber: string;
  profileImage: string;
  role: userRoleEnums;
  uid: string;
  linkedProviders: Array<linkedProvidersEnums>;
  location: {
    street: string;
    city: string;
    district: string;
    country: string;
  };
  socialLinks: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
  };
  gender?: genderEnums;
  dateOfBirth: {
    date: string;
    month: string;
    year: string;
  };
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
