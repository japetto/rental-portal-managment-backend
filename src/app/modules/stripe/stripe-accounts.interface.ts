import { Document, Types } from "mongoose";

export interface IStripeAccount extends Document {
  name: string;
  description?: string;
  propertyIds: Types.ObjectId[]; // Array of property IDs - supports multiple properties
  // Stripe Connect account details
  stripeAccountId: string;
  // Account status
  isActive: boolean;
  isVerified: boolean;
  // Global account flag - if true, can be used for all properties
  isGlobalAccount: boolean;
  // Default account flag - newly added properties will use this account
  isDefaultAccount: boolean;
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
  isDefaultAccount?: boolean;
  businessName?: string;
  businessEmail?: string;
  metadata?: any;
}

export interface IUpdateStripeAccount {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefaultAccount?: boolean;
  businessName?: string;
  businessEmail?: string;
  metadata?: any;
}

export interface ILinkPropertiesToAccount {
  accountId: string;
  propertyIds: string[];
}

export interface IUnlinkPropertiesFromAccount {
  accountId: string;
  propertyIds: string[];
}

export interface ISetDefaultAccount {
  accountId: string;
}
