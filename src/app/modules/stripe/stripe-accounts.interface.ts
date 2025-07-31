import { Document, Types } from "mongoose";

export interface IStripeAccount extends Document {
  name: string;
  description?: string;
  propertyId?: Types.ObjectId; // Optional - can be linked later
  // Stripe Connect account details
  stripeAccountId: string;
  // Account status
  isActive: boolean;
  isVerified: boolean;
  // Global account flag - if true, can be used for all properties
  isGlobalAccount: boolean;
  // Business information (minimal)
  businessName?: string;
  businessEmail?: string;
  // Metadata
  metadata?: any;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateStripeAccount {
  name: string;
  description?: string;
  stripeAccountId: string;
  isGlobalAccount?: boolean;
  businessName?: string;
  businessEmail?: string;
  metadata?: any;
}

export interface IUpdateStripeAccount {
  name?: string;
  description?: string;
  isActive?: boolean;
  businessName?: string;
  businessEmail?: string;
  metadata?: any;
}
