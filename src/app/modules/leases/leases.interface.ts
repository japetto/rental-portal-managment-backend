import { Document, Types } from "mongoose";

export type LeaseStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";

export type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";

export type LeaseType = "MONTHLY" | "FIXED_TERM";

export interface ILease extends Document {
  tenantId: Types.ObjectId; // Reference to User
  spotId: Types.ObjectId; // Reference to Spot
  propertyId: Types.ObjectId; // Reference to Property
  leaseType: LeaseType;
  leaseStart: Date;
  leaseEnd?: Date; // Optional for monthly leases (ongoing)
  rentAmount: number;
  depositAmount: number;
  paymentStatus: PaymentStatus;
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
  rvInfo: {
    make: string;
    model: string;
    year: number;
    length: number;
    licensePlate: string;
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
  rvInfo: {
    make: string;
    model: string;
    year: number;
    length: number;
    licensePlate: string;
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
  paymentStatus?: PaymentStatus;
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
  rvInfo?: {
    make?: string;
    model?: string;
    year?: number;
    length?: number;
    licensePlate?: string;
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
