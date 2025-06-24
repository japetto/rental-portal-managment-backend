import { model, Schema } from "mongoose";
import { IUser } from "./users.interface";
import bcrypt from "bcrypt";
import config from "../../../config/config";
import {
  GenderEnums,
  LinkedProvidersEnums,
  UserRoleEnums,
} from "./user.constant";

export const usersSchema = new Schema<IUser>(
  {
    userName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true },
    profileImage: {
      type: String,
      required: true,
      default: "https://i.ibb.co/dcHVrp8/User-Profile-PNG-Image.png",
    },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: UserRoleEnums },
    uid: { type: String, required: true, unique: true },
    linkedProviders: {
      type: [
        {
          type: String,
          enum: LinkedProvidersEnums,
        },
      ],
      required: true,
    },
    location: {
      street: { type: String, required: true, default: "Not Updated Yet!" },
      city: { type: String, required: true, default: "Not Updated Yet!" },
      district: { type: String, required: true, default: "Not Updated Yet!" },
      country: { type: String, required: true, default: "Bangladesh" },
    },
    socialLinks: {
      facebook: { type: String, required: true, default: "Not Updated Yet!" },
      instagram: { type: String, required: true, default: "Not Updated Yet!" },
      twitter: { type: String, required: true, default: "Not Updated Yet!" },
      linkedin: { type: String, required: true, default: "Not Updated Yet!" },
    },
    gender: {
      type: String,
      enum: GenderEnums,
      required: false,
    },
    dateOfBirth: {
      date: { type: String, required: true, default: "Not Updated Yet!" },
      year: { type: String, required: true, default: "Not Updated Yet!" },
      month: { type: String, required: true, default: "Not Updated Yet!" },
    },
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
