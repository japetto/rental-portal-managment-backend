"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantPaymentHistorySchema = exports.getTenantPaymentStatusSchema = exports.getPaymentLinkDetailsSchema = exports.createPaymentWithLinkSchema = void 0;
const zod_1 = require("zod");
// Create Payment with Link validation - Simplified for rent payments
exports.createPaymentWithLinkSchema = zod_1.z.object({
    body: zod_1.z.object({
        tenantId: zod_1.z.string().min(1, "Tenant ID is required"),
        // Optional: current date for payment calculation (defaults to current date)
        currentDate: zod_1.z.string().optional(),
    }),
});
// Get Payment Link Details validation
exports.getPaymentLinkDetailsSchema = zod_1.z.object({
    params: zod_1.z.object({
        paymentLinkId: zod_1.z.string().min(1, "Payment Link ID is required"),
    }),
});
// Get Tenant Payment Status validation
exports.getTenantPaymentStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        tenantId: zod_1.z.string().min(1, "Tenant ID is required"),
    }),
});
// Admin: Get specific tenant payment history
exports.getTenantPaymentHistorySchema = zod_1.z.object({
    params: zod_1.z.object({
        tenantId: zod_1.z.string().min(1, "Tenant ID is required"),
    }),
});
