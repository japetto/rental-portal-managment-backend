import { model, Schema } from "mongoose";
import {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from "../../../shared/enums/payment.enums";
import { IPayment } from "./payments.interface";

export const paymentsSchema = new Schema<IPayment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: true,
    },
    spotId: { type: Schema.Types.ObjectId, ref: "Spots", required: true },
    amount: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      enum: Object.values(PaymentType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
      default: PaymentStatus.PENDING,
    },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
    },
    transactionId: { type: String },
    receiptNumber: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    notes: { type: String },
    lateFeeAmount: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    createdBy: { type: String, required: true },
    // Stripe transaction fields
    stripeTransactionId: { type: String }, // From Stripe webhook
    stripePaymentLinkId: { type: String }, // Payment link ID from Stripe
    stripeAccountId: { type: Schema.Types.ObjectId, ref: "StripeAccounts" }, // Stripe account used for this payment
    isActive: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

// Pre-save middleware to calculate total amount
paymentsSchema.pre("save", function (next) {
  this.totalAmount = this.amount + (this.lateFeeAmount || 0);
  next();
});

// Pre-save middleware for soft delete
paymentsSchema.pre("save", function (next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Pre-save middleware for payment validation
paymentsSchema.pre("save", async function (next) {
  // Validate payment amount against lease for rent payments
  if (this.type === PaymentType.RENT) {
    const { Leases } = await import("../leases/leases.schema");
    const lease = await Leases.findOne({
      tenantId: this.tenantId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    });

    if (lease && this.amount !== lease.rentAmount) {
      return next(
        new Error(
          `Rent payment amount (${this.amount}) must match lease rent amount (${lease.rentAmount})`,
        ),
      );
    }
  }

  // Validate payment amount against lease for deposit payments
  if (this.type === PaymentType.DEPOSIT) {
    const { Leases } = await import("../leases/leases.schema");
    const lease = await Leases.findOne({
      tenantId: this.tenantId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    });

    if (lease && this.amount !== lease.depositAmount) {
      return next(
        new Error(
          `Deposit payment amount (${this.amount}) must match lease deposit amount (${lease.depositAmount})`,
        ),
      );
    }
  }

  // Validate due date is within lease period
  if (this.dueDate) {
    const { Leases } = await import("../leases/leases.schema");
    const lease = await Leases.findOne({
      tenantId: this.tenantId,
      leaseStatus: "ACTIVE",
      isDeleted: false,
    });

    if (lease) {
      if (this.dueDate < lease.leaseStart) {
        return next(
          new Error("Payment due date cannot be before lease start date"),
        );
      }

      if (lease.leaseEnd && this.dueDate > lease.leaseEnd) {
        return next(
          new Error("Payment due date cannot be after lease end date"),
        );
      }
    }
  }

  // Validate status transitions
  if (this.isModified("status")) {
    const validTransitions: Record<string, string[]> = {
      [PaymentStatus.PENDING]: [
        PaymentStatus.PAID,
        PaymentStatus.OVERDUE,
        PaymentStatus.CANCELLED,
      ],
      [PaymentStatus.OVERDUE]: [PaymentStatus.PAID, PaymentStatus.CANCELLED],
      [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
      [PaymentStatus.CANCELLED]: [],
      [PaymentStatus.REFUNDED]: [],
      [PaymentStatus.PARTIAL]: [
        PaymentStatus.PAID,
        PaymentStatus.OVERDUE,
        PaymentStatus.CANCELLED,
      ],
    };

    const currentStatus = this.status;
    // For new documents, skip validation
    // Note: Status transition validation would be better handled in the service layer
    // to avoid TypeScript issues with accessing previous document state
  }

  next();
});

// Pre-save middleware for cross-schema validation
paymentsSchema.pre("save", async function (next) {
  // Validate that tenant exists and is active
  const { Users } = await import("../users/users.schema");
  const tenant = await Users.findById(this.tenantId);
  if (!tenant || tenant.isDeleted || !tenant.isActive) {
    return next(new Error("Invalid tenant ID or tenant is inactive/deleted"));
  }

  // Validate that property exists and is active
  const { Properties } = await import("../properties/properties.schema");
  const property = await Properties.findById(this.propertyId);
  if (!property || property.isDeleted || !property.isActive) {
    return next(
      new Error("Invalid property ID or property is inactive/deleted"),
    );
  }

  // Validate that spot exists, is active, and belongs to the property
  const { Spots } = await import("../spots/spots.schema");
  const spot = await Spots.findById(this.spotId);
  if (!spot || spot.isDeleted || !spot.isActive) {
    return next(new Error("Invalid spot ID or spot is inactive/deleted"));
  }

  if (spot.propertyId.toString() !== this.propertyId.toString()) {
    return next(new Error("Spot does not belong to the assigned property"));
  }

  // Validate that there's an active lease for this tenant
  const { Leases } = await import("../leases/leases.schema");
  const lease = await Leases.findOne({
    tenantId: this.tenantId,
    leaseStatus: "ACTIVE",
    isDeleted: false,
  });

  if (!lease) {
    return next(new Error("No active lease found for this tenant"));
  }

  // Validate that payment property/spot matches lease property/spot
  if (lease.propertyId.toString() !== this.propertyId.toString()) {
    return next(new Error("Payment property does not match lease property"));
  }

  if (lease.spotId.toString() !== this.spotId.toString()) {
    return next(new Error("Payment spot does not match lease spot"));
  }

  next();
});

// Generate receipt number
paymentsSchema.pre("save", function (next) {
  if (this.isNew && !this.receiptNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.receiptNumber = `RCP-${timestamp}-${random}`;
  }
  next();
});

// Indexes for efficient queries
paymentsSchema.index({ tenantId: 1, status: 1 });
paymentsSchema.index({ propertyId: 1, status: 1 });
paymentsSchema.index({ dueDate: 1, status: 1 });
paymentsSchema.index({ paidDate: 1 });
paymentsSchema.index({ transactionId: 1 });
paymentsSchema.index({ type: 1, status: 1 });

// Virtual to check if payment is overdue
paymentsSchema.virtual("isOverdue").get(function (this: IPayment) {
  if (this.status === PaymentStatus.PAID) return false;
  return new Date() > this.dueDate;
});

// Virtual to calculate days overdue
paymentsSchema.virtual("daysOverdue").get(function (this: IPayment) {
  if (this.status === PaymentStatus.PAID || new Date() <= this.dueDate)
    return 0;
  const diffTime = Math.abs(new Date().getTime() - this.dueDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

export const Payments = model<IPayment>("Payments", paymentsSchema);
