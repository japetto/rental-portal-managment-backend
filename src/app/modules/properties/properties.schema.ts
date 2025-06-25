import { model, Schema } from "mongoose";
import { IProperty } from "./properties.interface";

export const propertiesSchema = new Schema<IProperty>(
  {
    name: { type: String, trim: true, required: true },
    description: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      country: { type: String, required: true, default: "USA" },
    },
    amenities: [{ type: String, required: true }],
    totalLots: { type: Number, required: true, min: 1 },
    availableLots: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
    images: [{ type: String }],
    rules: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

// Virtual for calculating occupied lots
propertiesSchema.virtual("occupiedLots").get(function (this: IProperty) {
  return this.totalLots - this.availableLots;
});

export const Properties = model<IProperty>("Properties", propertiesSchema);
