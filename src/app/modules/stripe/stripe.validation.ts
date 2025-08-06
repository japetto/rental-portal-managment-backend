import { z } from "zod";

// Create Stripe Account validation
export const createStripeAccountSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be less than 100 characters"),
    description: z.string().optional(),
    stripeAccountId: z.string().optional(),
    stripeSecretKey: z.string().min(1, "Stripe Secret Key is required"),
    accountType: z.enum(["STANDARD", "CONNECT"]).optional().default("STANDARD"),
    isGlobalAccount: z.boolean().optional(),
    isDefaultAccount: z.boolean().optional(),
  }),
});

// Link Properties to Account validation
export const linkPropertiesToAccountSchema = z.object({
  body: z.object({
    accountId: z.string().min(1, "Account ID is required"),
    propertyIds: z
      .array(z.string().min(1, "Property ID is required"))
      .min(1, "At least one property ID is required"),
  }),
});

// Unlink Properties from Account validation
export const unlinkPropertiesFromAccountSchema = z.object({
  body: z.object({
    accountId: z.string().min(1, "Account ID is required"),
    propertyIds: z
      .array(z.string().min(1, "Property ID is required"))
      .min(1, "At least one property ID is required"),
  }),
});

// Set Default Account validation
export const setDefaultAccountSchema = z.object({
  body: z.object({
    accountId: z.string().min(1, "Account ID is required"),
  }),
});

// Get Default Account validation
export const getDefaultAccountSchema = z.object({});

// Link Stripe Account to Property validation (legacy - kept for backward compatibility)
export const linkStripeAccountToPropertySchema = z.object({
  body: z.object({
    accountId: z.string().min(1, "Account ID is required"),
    propertyId: z.string().min(1, "Property ID is required"),
  }),
});

// Update Stripe Account validation
export const updateStripeAccountSchema = z.object({
  params: z.object({
    accountId: z.string().min(1, "Account ID is required"),
  }),
  body: z.object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().optional(),
    stripeSecretKey: z
      .string()
      .min(1, "Stripe Secret Key is required")
      .optional(),
    accountType: z.enum(["STANDARD", "CONNECT"]).optional(),
    isActive: z.boolean().optional(),
    isDefaultAccount: z.boolean().optional(),
  }),
});

// Get Stripe Account by ID validation
export const getStripeAccountByIdSchema = z.object({
  params: z.object({
    accountId: z.string().min(1, "Account ID is required"),
  }),
});

// Get Stripe Accounts by Property validation
export const getStripeAccountsByPropertySchema = z.object({
  params: z.object({
    propertyId: z.string().min(1, "Property ID is required"),
  }),
});

// Get Stripe Account by Property validation (legacy - kept for backward compatibility)
export const getStripeAccountByPropertySchema = z.object({
  params: z.object({
    propertyId: z.string().min(1, "Property ID is required"),
  }),
});

// Delete Stripe Account validation
export const deleteStripeAccountSchema = z.object({
  params: z.object({
    accountId: z.string().min(1, "Account ID is required"),
  }),
});

// Verify Stripe Account validation
export const verifyStripeAccountSchema = z.object({
  params: z.object({
    accountId: z.string().min(1, "Account ID is required"),
  }),
});

// Sync Payment History validation
export const syncPaymentHistorySchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});
