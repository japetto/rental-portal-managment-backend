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
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  specialRequests: string[];
  documents: string[]; // URLs to uploaded documents (PDF/DOC)
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
}

export interface ICreateLease {
  tenantId: string;
  spotId: string;
  propertyId: string;
  leaseType: LeaseType;
  leaseStart: Date;
  leaseEnd?: Date; // Optional for monthly leases
  rentAmount: number;
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
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  specialRequests?: string[];
  documents?: string[];
  notes?: string;
}

export interface IUpdateLease {
  leaseType?: LeaseType;
  leaseStart?: Date;
  leaseEnd?: Date;
  rentAmount?: number;
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
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  specialRequests?: string[];
  documents?: string[];
  notes?: string;
}
