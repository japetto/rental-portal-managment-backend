import { Document, Types } from "mongoose";

export type SpotStatus = "AVAILABLE" | "MAINTENANCE" | "RESERVED" | "BOOKED";

export interface ISpot extends Document {
  spotNumber: string;
  spotIdentifier: string;
  propertyId: Types.ObjectId;
  status: SpotStatus;
  size?: {
    length?: number; // in feet
    width?: number; // in feet
  };
  amenities: string[];
  price: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  description: string;
  images: string[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateSpot {
  spotNumber: string;
  spotIdentifier: string;
  propertyId: string;
  size?: {
    length?: number;
    width?: number;
  };
  amenities: string[];
  price: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  description: string;
  images?: string[];
}

export interface IUpdateSpot {
  spotNumber?: string;
  spotIdentifier?: string;
  status?: SpotStatus;
  size?: {
    length?: number;
    width?: number;
  };
  amenities?: string[];
  price?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  description?: string;
  images?: string[];
  isActive?: boolean;
}
