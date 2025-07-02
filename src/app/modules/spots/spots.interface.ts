import { Document, Types } from "mongoose";

export type SpotStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";

export interface ISpot extends Document {
  spotNumber: string;
  propertyId: Types.ObjectId;
  status: SpotStatus;
  size: {
    length: number; // in feet
    width: number; // in feet
  };
  price: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  description: string;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateSpot {
  spotNumber: string;
  propertyId: string;
  size: {
    length: number;
    width: number;
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
  status?: SpotStatus;
  size?: {
    length?: number;
    width?: number;
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
