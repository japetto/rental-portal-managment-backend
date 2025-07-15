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
