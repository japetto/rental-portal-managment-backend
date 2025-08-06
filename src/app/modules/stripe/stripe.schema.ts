import { model, Schema } from "mongoose";
import { IStripeAccount } from "./stripe.interface";

export const stripeAccountsSchema = new Schema<IStripeAccount>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, required: false },
    propertyIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Properties",
        required: false, // Optional - can be linked later
      },
    ],
    // Stripe secret key for this account (encrypted)
    stripeSecretKey: {
      type: String,
      required: true,
      select: false,
      unique: true,
    }, // Hidden by default for security
    // Account status
    isActive: { type: Boolean, required: true, default: true },
    isVerified: { type: Boolean, required: true, default: false },
    // Default account flag - newly added properties will use this account
    isDefaultAccount: { type: Boolean, required: true, default: false },

    // Webhook information
    webhookId: { type: String, required: false },
    webhookUrl: { type: String, required: false },
    webhookSecret: { type: String, required: false, select: false }, // Store webhook secret for verification
    webhookStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "FAILED"],
      default: "INACTIVE",
    },
    webhookCreatedAt: { type: Date },

    // Essential Stripe account info
    stripePublishableKey: { type: String }, // Publishable key for frontend
    stripeCurrency: { type: String, default: "usd" },

    // Metadata
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

// Pre-save middleware for validation
stripeAccountsSchema.pre("save", async function (next) {
  // Validate that all properties exist
  if (this.propertyIds && this.propertyIds.length > 0) {
    const { Properties } = await import("../properties/properties.schema");
    for (const propertyId of this.propertyIds) {
      const property = await Properties.findById(propertyId);
      if (!property || property.isDeleted) {
        return next(
          new Error(`Invalid property ID ${propertyId} or property is deleted`),
        );
      }
    }
  }

  // Ensure only one default account exists
  if (this.isDefaultAccount && !this.isNew) {
    const { StripeAccounts } = await import("./stripe.schema");
    const existingDefault = await StripeAccounts.findOne({
      isDefaultAccount: true,
      _id: { $ne: this._id },
    });
    if (existingDefault) {
      return next(new Error("Another account is already set as default"));
    }
  }

  next();
});

export const StripeAccounts = model<IStripeAccount>(
  "StripeAccounts",
  stripeAccountsSchema,
);
