import { model, Schema } from "mongoose";
import { ISpot } from "./spots.interface";

export const spotsSchema = new Schema<ISpot>(
  {
    spotNumber: { type: String, required: true },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: true,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "MAINTENANCE"],
      required: true,
      default: "AVAILABLE",
    },
    size: {
      length: { type: Number, required: true, min: 1 },
      width: { type: Number, required: true, min: 1 },
    },
    price: {
      daily: { type: Number, required: true, min: 0 },
      weekly: { type: Number, required: true, min: 0 },
      monthly: { type: Number, required: true, min: 0 },
    },
    description: { type: String, required: true },
    images: [{ type: String }],
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

// Compound index to ensure unique spot numbers within a property
spotsSchema.index({ propertyId: 1, spotNumber: 1 }, { unique: true });

export const Spots = model<ISpot>("Spots", spotsSchema);
