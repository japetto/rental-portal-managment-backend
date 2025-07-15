import { model, Schema } from "mongoose";
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
      enum: ["MONTHLY", "FIXED_TERM"],
      required: true,
    },
    leaseStart: { type: Date, required: true },
    leaseEnd: { type: Date, required: false }, // Optional for monthly leases
    rentAmount: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["PAID", "PENDING", "OVERDUE", "PARTIAL"],
      required: true,
      default: "PENDING",
    },
    leaseStatus: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"],
      required: true,
      default: "PENDING",
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
    rvInfo: {
      make: { type: String, required: true },
      model: { type: String, required: true },
      year: { type: Number, required: true, min: 1900 },
      length: { type: Number, required: true, min: 1 },
      licensePlate: { type: String, required: true },
    },
    emergencyContact: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      relationship: { type: String, required: true },
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
  if (this.leaseType === "MONTHLY" && !this.leaseEnd) {
    // Monthly leases without end date are active if they've started and status is ACTIVE
    return this.leaseStart <= now && this.leaseStatus === "ACTIVE";
  }
  if (this.leaseEnd) {
    return (
      this.leaseStart <= now &&
      this.leaseEnd >= now &&
      this.leaseStatus === "ACTIVE"
    );
  }
  return false;
});

// Index for efficient queries
leasesSchema.index({ tenantId: 1, leaseStatus: 1 });
leasesSchema.index({ spotId: 1, leaseStatus: 1 });
leasesSchema.index({ propertyId: 1, leaseStatus: 1 });
leasesSchema.index({ leaseStart: 1, leaseEnd: 1 });
leasesSchema.index({ leaseType: 1, leaseStatus: 1 });

export const Leases = model<ILease>("Leases", leasesSchema);
