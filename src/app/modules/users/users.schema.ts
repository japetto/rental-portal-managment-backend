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
      required: true,
      select: false,
      minlength: [6, "Password must be at least 6 characters long"],
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
    emergencyContact: {
      name: { type: String, required: false },
      phone: { type: String, required: false },
      relationship: { type: String, required: false },
    },
    specialRequests: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

usersSchema.pre("save", async function (next) {
  this.password = await bcrypt.hash(this.password, Number(config.salt_round));
  next();
});

export const Users = model<IUser>("Users", usersSchema);
