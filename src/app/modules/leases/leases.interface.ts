import { Document, Types } from "mongoose";

export type LeaseStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";

export type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";

export interface ILease extends Document {
  tenantId: Types.ObjectId; // Reference to User
  spotId: Types.ObjectId; // Reference to Spot
  propertyId: Types.ObjectId; // Reference to Property
  leaseStart: Date;
  leaseEnd: Date;
  rentAmount: number;
  depositAmount: number;
  paymentStatus: PaymentStatus;
  leaseStatus: LeaseStatus;
  occupants: number;
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
  documents: string[]; // URLs to uploaded documents
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateLease {
  tenantId: string;
  spotId: string;
  propertyId: string;
  leaseStart: Date;
  leaseEnd: Date;
  rentAmount: number;
  depositAmount: number;
  occupants: number;
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
  leaseStart?: Date;
  leaseEnd?: Date;
  rentAmount?: number;
  depositAmount?: number;
  paymentStatus?: PaymentStatus;
  leaseStatus?: LeaseStatus;
  occupants?: number;
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
