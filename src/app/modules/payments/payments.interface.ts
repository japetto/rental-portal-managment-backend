import { Document, Types } from "mongoose";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentMethod =
  | "CASH"
  | "CHECK"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BANK_TRANSFER"
  | "ONLINE";
export type PaymentType =
  | "RENT"
  | "DEPOSIT"
  | "LATE_FEE"
  | "UTILITY"
  | "MAINTENANCE"
  | "OTHER";

export interface IPayment extends Document {
  tenantId: Types.ObjectId; // Reference to User (tenant)
  propertyId: Types.ObjectId; // Reference to Property
  spotId: Types.ObjectId; // Reference to Spot
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: PaymentMethod;
  transactionId?: string; // External payment processor transaction ID
  receiptNumber: string; // Internal receipt number
  description: string;
  notes?: string;
  lateFeeAmount?: number;
  totalAmount: number; // amount + lateFeeAmount
  createdBy: string; // Admin who created the payment record
  // Stripe payment fields
  stripePaymentLinkId?: string; // Link to Stripe payment link
  stripeTransactionId?: string; // From Stripe webhook
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  isOverdue: boolean;
  daysOverdue: number;
}

export interface ICreatePayment {
  tenantId: string;
  propertyId: string;
  spotId: string;
  amount: number;
  type: PaymentType;
  dueDate: Date;
  description: string;
  notes?: string;
  lateFeeAmount?: number;
}

export interface IUpdatePayment {
  amount?: number;
  type?: PaymentType;
  status?: PaymentStatus;
  dueDate?: Date;
  paidDate?: Date;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  description?: string;
  notes?: string;
  lateFeeAmount?: number;
}

export interface IRecordPayment {
  paymentId: string;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  notes?: string;
}

export interface IPaymentHistory {
  tenantId: string;
  propertyId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: PaymentStatus;
  type?: PaymentType;
}
