import { Document, Types } from "mongoose";

export interface IStripeAccount extends Document {
  name: string;
  description?: string;
  propertyIds: Types.ObjectId[]; // Array of property IDs - supports multiple properties
  // Stripe account details
  stripeAccountId?: string; // Optional for STANDARD accounts
  stripeSecretKey: string; // Secret key for this Stripe account
  accountType: "STANDARD" | "CONNECT"; // STANDARD = user's own account, CONNECT = platform account
  // Account status
  isActive: boolean;
  isVerified: boolean;
  // Global account flag - if true, can be used for all properties
  isGlobalAccount: boolean;
  // Default account flag - newly added properties will use this account
  isDefaultAccount: boolean;

  // Webhook information
  webhookId?: string;
  webhookUrl?: string;
  webhookStatus?: "ACTIVE" | "INACTIVE" | "FAILED";
  webhookCreatedAt?: Date;

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
  stripeAccountId?: string; // Optional for STANDARD, required for CONNECT
  stripeSecretKey: string; // Required when creating account
  accountType?: "STANDARD" | "CONNECT"; // Defaults to STANDARD if not specified
  isGlobalAccount?: boolean;
  isDefaultAccount?: boolean;
  metadata?: any;
}

export interface IUpdateStripeAccount {
  name?: string;
  description?: string;
  stripeSecretKey?: string; // Optional when updating
  accountType?: "STANDARD" | "CONNECT"; // Can be updated
  isActive?: boolean;
  isDefaultAccount?: boolean;
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
