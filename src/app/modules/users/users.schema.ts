import bcrypt from "bcrypt";
import { model, Schema } from "mongoose";
import config from "../../../config/config";
import { UserRoleEnums } from "./user.constant";
import { IUser } from "./users.interface";

export const usersSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    profileImage: {
      type: String,
      required: true,
      default: "https://i.ibb.co/dcHVrp8/User-Profile-PNG-Image.png",
    },
    password: {
      type: String,
      required: false,
      select: false,
      validate: {
        validator: function (value: string) {
          // If password is provided, it must be at least 6 characters
          if (value && value.trim() !== "") {
            return value.length >= 6;
          }
          // If password is empty or not provided, it's valid
          return true;
        },
        message: "Password must be at least 6 characters long",
      },
    },
    role: {
      type: String,
      required: true,
      enum: UserRoleEnums,
      default: "TENANT",
    },
    isInvited: { type: Boolean, required: false, default: false },
    isVerified: { type: Boolean, required: false, default: false },
    bio: { type: String, required: false, default: "Not Updated Yet!" },
    preferredLocation: {
      type: String,
      required: true,
    },
    // Tenant-specific fields
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: false,
    },
    spotId: { type: Schema.Types.ObjectId, ref: "Spots", required: false },
    leaseId: { type: Schema.Types.ObjectId, ref: "Leases", required: false },
    // RV Information (tenant's personal property)
    rvInfo: {
      make: { type: String, required: false },
      model: { type: String, required: false },
      year: { type: Number, required: false, min: 1900 },
      length: { type: Number, required: false, min: 1 },
      licensePlate: { type: String, required: false },
    },
    isActive: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
    // History tracking for property and spot assignments
    userHistory: [
      {
        propertyId: { type: Schema.Types.ObjectId, ref: "Properties" },
        spotId: { type: Schema.Types.ObjectId, ref: "Spots" },
        leaseId: { type: Schema.Types.ObjectId, ref: "Leases" },
        assignedAt: { type: Date, default: Date.now },
        removedAt: { type: Date },
        reason: { type: String }, // "LEASE_START", "LEASE_END", "TRANSFER", "CANCELLATION"
      },
    ],
    // Stripe customer ID for webhook lookup (kept for backward compatibility)
    stripeCustomerId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

usersSchema.pre("save", async function (next) {
  if (
    this.password &&
    this.password.trim() !== "" &&
    this.isModified("password")
  ) {
    this.password = await bcrypt.hash(this.password, Number(config.salt_round));
  }
  next();
});

// Pre-save middleware for soft delete
usersSchema.pre("save", function (next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Pre-save middleware for validation
usersSchema.pre("save", async function (next) {
  // Validate that if propertyId is set, it exists
  if (this.propertyId) {
    const { Properties } = await import("../properties/properties.schema");
    const property = await Properties.findById(this.propertyId);
    if (!property || property.isDeleted) {
      return next(new Error("Invalid property ID or property is deleted"));
    }
  }

  // Validate that if spotId is set, it exists and belongs to the property
  if (this.spotId) {
    const { Spots } = await import("../spots/spots.schema");
    const spot = await Spots.findById(this.spotId);
    if (!spot || spot.isDeleted) {
      return next(new Error("Invalid spot ID or spot is deleted"));
    }

    // If both propertyId and spotId are set, validate they match
    if (
      this.propertyId &&
      spot.propertyId.toString() !== this.propertyId.toString()
    ) {
      return next(new Error("Spot does not belong to the assigned property"));
    }
  }

  // Validate that if leaseId is set, it exists and belongs to this tenant
  if (this.leaseId) {
    const { Leases } = await import("../leases/leases.schema");
    const lease = await Leases.findById(this.leaseId);
    if (!lease || lease.isDeleted) {
      return next(new Error("Invalid lease ID or lease is deleted"));
    }

    if ((lease.tenantId as any).toString() !== (this._id as any).toString()) {
      return next(new Error("Lease does not belong to this tenant"));
    }
  }

  next();
});

// Instance method to compare password
usersSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual to get user's active lease
usersSchema.virtual("activeLease", {
  ref: "Leases",
  localField: "_id",
  foreignField: "tenantId",
  justOne: true,
  match: { leaseStatus: "ACTIVE" },
});

// Virtual to get user's pending payments count
usersSchema.virtual("pendingPaymentsCount", {
  ref: "Payments",
  localField: "_id",
  foreignField: "tenantId",
  count: true,
  match: { status: { $in: ["PENDING", "OVERDUE"] } },
});

export const Users = model<IUser>("Users", usersSchema);
