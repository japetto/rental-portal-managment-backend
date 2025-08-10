import { Document } from "mongoose";

export type IdentifierType = "lotNumber" | "roadNumber";

export interface IProperty extends Document {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  identifierType: IdentifierType;
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
  stripeAccount?: unknown; // Virtual field for assigned Stripe account
}

export interface ICreateProperty {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  identifierType: IdentifierType;
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
  };
  identifierType?: IdentifierType;
  amenities?: string[];
  images?: string[];
  rules?: string[];
}

// Summarized Stripe account information associated with a property
export interface IStripeAccountSummary {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isVerified: boolean;
  isDefaultAccount: boolean;
}

// Property with computed lot data and optional Stripe account summary
export interface IPropertyWithStripeSummary {
  _id: string;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  identifierType: IdentifierType;
  amenities: string[];
  images: string[];
  rules: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalSpots: number;
  availableSpots: number;
  maintenanceSpots: number;
  stripeAccount: IStripeAccountSummary | null;
  hasStripeAccount: boolean;
}

export interface IAvailableStripeAccounts {
  propertySpecific: IStripeAccountSummary | null;
  globalAccounts: IStripeAccountSummary[];
  hasPropertySpecific: boolean;
  hasGlobalAccounts: boolean;
  totalAvailableAccounts: number;
}

export interface IPropertyWithAvailableStripe
  extends Omit<
    IPropertyWithStripeSummary,
    "stripeAccount" | "hasStripeAccount"
  > {
  stripeAccount: IStripeAccountSummary | null;
  availableStripeAccounts: IAvailableStripeAccounts;
}
