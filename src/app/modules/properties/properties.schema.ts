import { model, Schema } from "mongoose";
import { IProperty } from "./properties.interface";

export const propertiesSchema = new Schema<IProperty>(
  {
    name: { type: String, unique: true, trim: true, required: true },
    description: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
    },
    identifierType: {
      type: String,
      enum: ["lotNumber", "roadNumber"],
      required: true,
    },
    amenities: [{ type: String, required: true }],
    images: [{ type: String }],
    rules: [{ type: String }],
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

// Virtual to get total spots count
propertiesSchema.virtual("totalSpots", {
  ref: "Spots",
  localField: "_id",
  foreignField: "propertyId",
  count: true,
});

// Virtual to get available spots count
propertiesSchema.virtual("availableSpots", {
  ref: "Spots",
  localField: "_id",
  foreignField: "propertyId",
  count: true,
  match: { status: "AVAILABLE", isActive: true },
});

// Virtual to get assigned Stripe account
propertiesSchema.virtual("stripeAccount", {
  ref: "StripeAccounts",
  localField: "_id",
  foreignField: "propertyIds",
  justOne: true,
});

export const Properties = model<IProperty>("Properties", propertiesSchema);
