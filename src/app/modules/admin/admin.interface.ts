export interface IInviteTenant {
  name: string;
  email: string;
  phoneNumber: string;
  propertyId: string;
  spotId: string;
  preferredLocation?: string;
}

export interface ICreateSpot {
  spotNumber: string;
  propertyId: string;
  size: {
    length: number;
    width: number;
  };
  amenities: string[];
  hookups: {
    water: boolean;
    electricity: boolean;
    sewer: boolean;
    wifi: boolean;
  };
  price: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  description: string;
  images?: string[];
}

export interface IUpdateSpot {
  spotNumber?: string;
  status?: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
  size?: {
    length?: number;
    width?: number;
  };
  amenities?: string[];
  hookups?: {
    water?: boolean;
    electricity?: boolean;
    sewer?: boolean;
    wifi?: boolean;
  };
  price?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  description?: string;
  images?: string[];
  isActive?: boolean;
}

export interface ICreateProperty {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  amenities: string[];
  images?: string[];
  rules?: string[];
}

export interface IUpdateProperty {
  name?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  amenities?: string[];
  images?: string[];
  rules?: string[];
}

// Admin User Management Interfaces
export interface IAdminUpdateUser {
  name?: string;
  phoneNumber?: string;
  preferredLocation?: string;
  bio?: string;
  profileImage?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  specialRequests?: string[];
  role?: "SUPER_ADMIN" | "TENANT";
  isVerified?: boolean;
  isInvited?: boolean;
}
