import { Document } from "mongoose";

export interface IProperty extends Document {
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
  images: string[];
  rules: string[];
  stripeAccountId?: string; // Stripe Connect account ID for this property
  propertyName: string; // Unique identifier for Stripe metadata
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  totalSpots: number;
  availableSpots: number;
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
  propertyName: string; // Required for Stripe metadata
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
  stripeAccountId?: string; // Stripe Connect account ID
  propertyName?: string; // Unique identifier for Stripe metadata
}
