import { Document, Types } from "mongoose";

export type SpotStatus = "AVAILABLE" | "MAINTENANCE" | "RESERVED" | "BOOKED";

export interface ISpot extends Document {
  spotNumber: string;
  propertyId: Types.ObjectId;
  lotIdentifier: string;
  lotType: string;
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
  propertyId: string;
  lotIdentifier: string;
  lotType: string;
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
  lotIdentifier?: string;
  lotType?: string;
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
