import { z } from "zod";

// Create Payment with Link validation - Simplified for rent payments
export const createPaymentWithLinkSchema = z.object({
  body: z.object({
    tenantId: z.string().min(1, "Tenant ID is required"),
    // Optional: current date for payment calculation (defaults to current date)
    currentDate: z.string().optional(),
  }),
});

// Get Payment Link Details validation
export const getPaymentLinkDetailsSchema = z.object({
  params: z.object({
    paymentLinkId: z.string().min(1, "Payment Link ID is required"),
  }),
});

// Get Tenant Payment Status validation
export const getTenantPaymentStatusSchema = z.object({
  params: z.object({
    tenantId: z.string().min(1, "Tenant ID is required"),
  }),
});
