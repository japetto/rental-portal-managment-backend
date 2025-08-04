import { Document } from "mongoose";

export interface IProperty extends Document {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  amenities: string[];
  images: string[];
  rules: string[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  totalSpots: number;
  availableSpots: number;
  stripeAccount?: any; // Virtual field for assigned Stripe account
}

export interface ICreateProperty {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
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
