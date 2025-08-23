import { Document, Types } from "mongoose";
import {
  LeaseStatus,
  LeaseType,
  PaymentStatus,
} from "../../../shared/enums/payment.enums";

export interface ILease extends Document {
  tenantId: Types.ObjectId; // Reference to User
  spotId: Types.ObjectId; // Reference to Spot
  propertyId: Types.ObjectId; // Reference to Property
  leaseType: LeaseType;
  leaseStart: Date;
  leaseEnd?: Date; // Optional for monthly leases (ongoing)
  rentAmount: number;
  additionalRentAmount: number; // Additional rent amount (utilities, services, etc.)
  depositAmount: number;
  leaseStatus: LeaseStatus;
  occupants: number;
  pets: {
    hasPets: boolean;
    petDetails?: {
      type: string;
      breed: string;
      name: string;
      weight: number;
    }[];
  };
  specialRequests: string[];
  documents: string[]; // URLs to uploaded documents (PDF/DOC)
  leaseAgreement?: string; // URL to the signed lease agreement document
  notes: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  durationDays: number;
  isLeaseActive: boolean;
  paymentStatus: PaymentStatus; // Virtual property calculated from payments
  totalRentAmount: number; // Virtual property for total rent (rentAmount + additionalRentAmount)
}

export interface ICreateLease {
  tenantId: string;
  spotId: string;
  propertyId: string;
  leaseType: LeaseType;
  leaseStart: Date;
  leaseEnd?: Date; // Optional for monthly leases
  rentAmount: number;
  additionalRentAmount?: number; // Optional additional rent amount
  depositAmount: number;
  occupants: number;
  pets: {
    hasPets: boolean;
    petDetails?: {
      type: string;
      breed: string;
      name: string;
      weight: number;
    }[];
  };
  specialRequests?: string[];
  documents?: string[];
  leaseAgreement?: string; // URL to the signed lease agreement document
  notes?: string;
}

export interface IUpdateLease {
  leaseType?: LeaseType;
  leaseStart?: Date;
  leaseEnd?: Date;
  rentAmount?: number;
  additionalRentAmount?: number;
  depositAmount?: number;
  leaseStatus?: LeaseStatus;
  occupants?: number;
  pets?: {
    hasPets?: boolean;
    petDetails?: {
      type: string;
      breed: string;
      name: string;
      weight: number;
    }[];
  };
  specialRequests?: string[];
  documents?: string[];
  leaseAgreement?: string; // URL to the signed lease agreement document
  notes?: string;
}
