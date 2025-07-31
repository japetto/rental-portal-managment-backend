import { model, Schema } from "mongoose";
import { IStripeAccount } from "./stripe-accounts.interface";

export const stripeAccountsSchema = new Schema<IStripeAccount>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: false },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Properties",
      required: false, // Optional - can be linked later
    },
    // Stripe Connect account details
    stripeAccountId: { type: String, required: true, unique: true },
    // Account status
    isActive: { type: Boolean, required: true, default: true },
    isVerified: { type: Boolean, required: true, default: false },
    // Global account flag - if true, can be used for all properties
    isGlobalAccount: { type: Boolean, required: true, default: false },
    // Business information (minimal)
    businessName: { type: String, required: false },
    businessEmail: { type: String, required: false },
    // Metadata
    metadata: { type: Schema.Types.Mixed },
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
stripeAccountsSchema.pre("save", function (next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Pre-save middleware for validation
stripeAccountsSchema.pre("save", async function (next) {
  // Validate that property exists
  if (this.propertyId) {
    const { Properties } = await import("../properties/properties.schema");
    const property = await Properties.findById(this.propertyId);
    if (!property || property.isDeleted) {
      return next(new Error("Invalid property ID or property is deleted"));
    }
  }

  next();
});

export const StripeAccounts = model<IStripeAccount>(
  "StripeAccounts",
  stripeAccountsSchema,
);
