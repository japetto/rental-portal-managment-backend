import { Document, Types } from "mongoose";

export interface IStripeAccount extends Document {
  name: string;
  description?: string;
  propertyId: Types.ObjectId;
  // Stripe Connect account details
  stripeAccountId: string;
  // Account status
  isActive: boolean;
  isVerified: boolean;
  // Business information (minimal)
  businessName?: string;
  businessEmail?: string;
  // Application fee settings
  applicationFeePercent: number;
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
  propertyId: string;
  stripeAccountId: string;
  businessName?: string;
  businessEmail?: string;
  applicationFeePercent?: number;
  metadata?: any;
}

export interface IUpdateStripeAccount {
  name?: string;
  description?: string;
  isActive?: boolean;
  businessName?: string;
  businessEmail?: string;
  applicationFeePercent?: number;
  metadata?: any;
}
