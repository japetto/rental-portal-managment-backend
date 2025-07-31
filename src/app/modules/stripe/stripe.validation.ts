import { z } from "zod";

// Create Stripe Account validation
export const createStripeAccountSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    stripeAccountId: z.string().min(1, "Stripe Account ID is required"),
    isGlobalAccount: z.boolean().optional(),
    businessName: z.string().optional(),
    businessEmail: z.string().email("Invalid email format").optional(),
  }),
});

// Link Stripe Account to Property validation
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
    businessName: z.string().optional(),
    businessEmail: z.string().email("Invalid email format").optional(),
    isActive: z.boolean().optional(),
  }),
});

// Get Stripe Account by ID validation
export const getStripeAccountByIdSchema = z.object({
  params: z.object({
    accountId: z.string().min(1, "Account ID is required"),
  }),
});

// Get Stripe Account by Property validation
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

// Create Payment with Link validation
export const createPaymentWithLinkSchema = z.object({
  body: z.object({
    tenantId: z.string().min(1, "Tenant ID is required"),
    propertyId: z.string().min(1, "Property ID is required"),
    spotId: z.string().min(1, "Spot ID is required"),
    amount: z.number().positive("Amount must be positive"),
    type: z.string().min(1, "Payment type is required"),
    dueDate: z.string().min(1, "Due date is required"),
    description: z.string().min(1, "Description is required"),
    lateFeeAmount: z.number().min(0).optional(),
  }),
});

// Get Payment Link Details validation
export const getPaymentLinkDetailsSchema = z.object({
  params: z.object({
    paymentLinkId: z.string().min(1, "Payment Link ID is required"),
  }),
});

// Sync Payment History validation
export const syncPaymentHistorySchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});
