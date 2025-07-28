import { model, Schema } from "mongoose";
import { LeaseStatus, LeaseType } from "../../../shared/enums/payment.enums";
import { ILease } from "./leases.interface";

export const leasesSchema = new Schema<ILease>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    spotId: { type: Schema.Types.ObjectId, ref: "Spots", required: true },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: true,
    },
    leaseType: {
      type: String,
      enum: Object.values(LeaseType),
      required: true,
    },
    leaseStart: { type: Date, required: true },
    leaseEnd: { type: Date, required: false }, // Optional for monthly leases
    rentAmount: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, required: true, min: 0 },
    leaseStatus: {
      type: String,
      enum: Object.values(LeaseStatus),
      required: false,
    },
    occupants: { type: Number, required: true, min: 1 },
    pets: {
      hasPets: { type: Boolean, required: true, default: false },
      petDetails: [
        {
          type: { type: String, required: true },
          breed: { type: String, required: true },
          name: { type: String, required: true },
          weight: { type: Number, required: true, min: 0 },
        },
      ],
    },

    emergencyContact: {
      name: { type: String, required: false },
      phone: { type: String, required: false },
      relationship: { type: String, required: false },
    },
    specialRequests: [{ type: String }],
    documents: [{ type: String }], // URLs for PDF/DOC files
    notes: { type: String, default: "" },
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

// Pre-save middleware for soft delete
leasesSchema.pre("save", function (next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Pre-save middleware for lease validation
leasesSchema.pre("save", function (next) {
  // Validate lease type and end date logic
  if (this.leaseType === LeaseType.FIXED_TERM && !this.leaseEnd) {
    return next(new Error("Lease end date is required for FIXED_TERM leases"));
  }

  if (this.leaseType === LeaseType.MONTHLY && this.leaseEnd) {
    return next(
      new Error("Lease end date should not be provided for MONTHLY leases"),
    );
  }

  // Validate pet details if hasPets is true
  if (
    this.pets.hasPets &&
    (!this.pets.petDetails || this.pets.petDetails.length === 0)
  ) {
    return next(new Error("Pet details are required when hasPets is true"));
  }

  // Set default lease status based on start date
  const now = new Date();
  if (!this.leaseStatus || this.leaseStatus === LeaseStatus.PENDING) {
    this.leaseStatus =
      this.leaseStart <= now ? LeaseStatus.ACTIVE : LeaseStatus.PENDING;
  }

  next();
});

// Pre-save middleware for cross-schema validation
leasesSchema.pre("save", async function (next) {
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

  // Validate that tenant exists and is active
  const { Users } = await import("../users/users.schema");
  const tenant = await Users.findById(this.tenantId);
  if (!tenant || tenant.isDeleted || !tenant.isActive) {
    return next(new Error("Invalid tenant ID or tenant is inactive/deleted"));
  }

  // Check if spot is already occupied by another active lease
  const { Leases } = await import("./leases.schema");
  const existingLease = await Leases.findOne({
    spotId: this.spotId,
    leaseStatus: LeaseStatus.ACTIVE,
    isDeleted: false,
    _id: { $ne: this._id }, // Exclude current lease if updating
  });

  if (existingLease) {
    return next(new Error("Spot is already occupied by another active lease"));
  }

  next();
});

// Virtual for calculating lease duration in days
leasesSchema.virtual("durationDays").get(function (this: ILease) {
  if (!this.leaseEnd) {
    // For monthly leases without end date, calculate from start to current date
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.leaseStart.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  const diffTime = Math.abs(
    this.leaseEnd.getTime() - this.leaseStart.getTime(),
  );
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for checking if lease is active
leasesSchema.virtual("isLeaseActive").get(function (this: ILease) {
  const now = new Date();
  if (this.leaseType === LeaseType.MONTHLY && !this.leaseEnd) {
    // Monthly leases without end date are active if they've started and status is ACTIVE
    return this.leaseStart <= now && this.leaseStatus === LeaseStatus.ACTIVE;
  }
  if (this.leaseEnd) {
    return (
      this.leaseStart <= now &&
      this.leaseEnd >= now &&
      this.leaseStatus === LeaseStatus.ACTIVE
    );
  }
  return false;
});

// Virtual for calculating payment status from related payments
leasesSchema.virtual("paymentStatus").get(async function (this: ILease) {
  const { Payments } = await import("../payments/payments.schema");
  const { PaymentStatus } = await import("../../../shared/enums/payment.enums");

  const payments = await Payments.find({
    tenantId: this.tenantId,
    type: "RENT",
    isDeleted: false,
  });

  if (payments.length === 0) {
    return PaymentStatus.PENDING;
  }

  const pendingPayments = payments.filter(
    p => p.status === PaymentStatus.PENDING,
  );
  const overduePayments = payments.filter(
    p => p.status === PaymentStatus.OVERDUE,
  );
  const paidPayments = payments.filter(p => p.status === PaymentStatus.PAID);

  if (overduePayments.length > 0) {
    return PaymentStatus.OVERDUE;
  }

  if (pendingPayments.length > 0 && paidPayments.length > 0) {
    return PaymentStatus.PARTIAL;
  }

  if (pendingPayments.length > 0) {
    return PaymentStatus.PENDING;
  }

  return PaymentStatus.PAID;
});

export const Leases = model<ILease>("Leases", leasesSchema);
