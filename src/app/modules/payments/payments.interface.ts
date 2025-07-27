import { Document, Types } from "mongoose";
import {
  LeaseStatus,
  LeaseType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from "../../../shared/enums/payment.enums";

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
  // Stripe transaction field (payment-specific)
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

export interface IRentSummaryResponse {
  hasActiveLease: boolean;
  message?: string;
  rentSummary?: {
    // Payment link information
    paymentLink: {
      id?: string;
      url?: string;
    };
    property: {
      id: any;
      name: string;
      address: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country?: string;
      };
    };
    spot: {
      id: any;
      spotNumber: string;
      spotIdentifier: string;
      amenities: string[];
      size?: {
        length?: number;
        width?: number;
      };
    };
    lease: {
      id: any;
      leaseType: LeaseType;
      leaseStart: Date;
      leaseEnd?: Date;
      rentAmount: number;
      depositAmount: number;
      leaseStatus: LeaseStatus;
      paymentStatus: PaymentStatus;
    };
    currentMonth: {
      dueDate: Date;
      rentAmount: number;
      status: PaymentStatus;
      paidDate?: Date;
      paymentMethod?: PaymentMethod;
      lateFeeAmount: number;
      totalAmount: number;
      daysOverdue: number;
      receiptNumber?: string;
    };
    summary: {
      totalOverdueAmount: number;
      overdueCount: number;
      pendingCount: number;
      totalPaidAmount: number;
      averagePaymentAmount: number;
    };
    recentPayments: Array<{
      id: any;
      dueDate: Date;
      paidDate?: Date;
      amount: number;
      paymentMethod?: PaymentMethod;
      receiptNumber: string;
      status: PaymentStatus;
    }>;
    pendingPayments: Array<{
      id: any;
      dueDate: Date;
      amount: number;
      status: PaymentStatus;
      daysOverdue: number;
    }>;
  };
}
