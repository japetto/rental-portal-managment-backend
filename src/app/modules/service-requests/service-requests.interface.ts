import { Document, Types } from "mongoose";

export type ServiceRequestStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type ServiceRequestPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ServiceRequestType =
  | "MAINTENANCE"
  | "UTILITY"
  | "SECURITY"
  | "CLEANING"
  | "OTHER";

export interface IServiceRequest extends Document {
  tenantId: Types.ObjectId; // Reference to User (tenant)
  propertyId: Types.ObjectId; // Reference to Property
  spotId: Types.ObjectId; // Reference to Spot
  title: string;
  description: string;
  type: ServiceRequestType;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  requestedDate: Date;
  completedDate?: Date;
  assignedTo?: string; // Admin assigned to handle the request
  estimatedCost?: number;
  actualCost?: number;
  images: string[]; // Photos of the issue
  adminNotes?: string; // Notes from admin
  tenantNotes?: string; // Additional notes from tenant
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateServiceRequest {
  tenantId: string;
  propertyId: string;
  spotId: string;
  title: string;
  description: string;
  type: ServiceRequestType;
  priority?: ServiceRequestPriority;
  images?: string[];
  tenantNotes?: string;
}

export interface IUpdateServiceRequest {
  title?: string;
  description?: string;
  type?: ServiceRequestType;
  priority?: ServiceRequestPriority;
  status?: ServiceRequestStatus;
  completedDate?: Date;
  assignedTo?: string;
  estimatedCost?: number;
  actualCost?: number;
  images?: string[];
  adminNotes?: string;
  tenantNotes?: string;
}
