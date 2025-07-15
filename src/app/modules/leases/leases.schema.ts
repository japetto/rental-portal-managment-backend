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
    leaseStart: { type: Date, required: true },
    leaseEnd: { type: Date, required: true },
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
    documents: [{ type: String }],
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
  const diffTime = Math.abs(
    this.leaseEnd.getTime() - this.leaseStart.getTime(),
  );
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for checking if lease is active
leasesSchema.virtual("isLeaseActive").get(function (this: ILease) {
  const now = new Date();
  return (
    this.leaseStart <= now &&
    this.leaseEnd >= now &&
    this.leaseStatus === "ACTIVE"
  );
});

// Index for efficient queries
leasesSchema.index({ tenantId: 1, leaseStatus: 1 });
leasesSchema.index({ spotId: 1, leaseStatus: 1 });
leasesSchema.index({ propertyId: 1, leaseStatus: 1 });
leasesSchema.index({ leaseStart: 1, leaseEnd: 1 });

export const Leases = model<ILease>("Leases", leasesSchema);
