"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPaymentHistorySchema = exports.verifyStripeAccountSchema = exports.deleteStripeAccountSchema = exports.getStripeAccountByPropertySchema = exports.getStripeAccountsByPropertySchema = exports.getStripeAccountByIdSchema = exports.updateStripeAccountSchema = exports.linkStripeAccountToPropertySchema = exports.getDefaultAccountSchema = exports.setDefaultAccountSchema = exports.unlinkPropertiesFromAccountSchema = exports.linkPropertiesToAccountSchema = exports.createStripeAccountSchema = void 0;
const zod_1 = require("zod");
// Create Stripe Account validation
exports.createStripeAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string()
            .min(1, "Name is required")
            .max(100, "Name must be less than 100 characters"),
        description: zod_1.z.string().optional(),
        stripeSecretKey: zod_1.z.string().min(1, "Stripe Secret Key is required"),
        isDefaultAccount: zod_1.z.boolean().optional(),
        metadata: zod_1.z.any().optional(),
    }),
});
// Link Properties to Account validation
exports.linkPropertiesToAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        accountId: zod_1.z.string().min(1, "Account ID is required"),
        propertyIds: zod_1.z
            .array(zod_1.z.string().min(1, "Property ID is required"))
            .min(1, "At least one property ID is required"),
    }),
});
// Unlink Properties from Account validation
exports.unlinkPropertiesFromAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        accountId: zod_1.z.string().min(1, "Account ID is required"),
        propertyIds: zod_1.z
            .array(zod_1.z.string().min(1, "Property ID is required"))
            .min(1, "At least one property ID is required"),
    }),
});
// Set Default Account validation
exports.setDefaultAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        accountId: zod_1.z.string().min(1, "Account ID is required"),
    }),
});
// Get Default Account validation
exports.getDefaultAccountSchema = zod_1.z.object({});
// Link Stripe Account to Property validation (legacy - kept for backward compatibility)
exports.linkStripeAccountToPropertySchema = zod_1.z.object({
    body: zod_1.z.object({
        accountId: zod_1.z.string().min(1, "Account ID is required"),
        propertyId: zod_1.z.string().min(1, "Property ID is required"),
    }),
});
// Update Stripe Account validation
exports.updateStripeAccountSchema = zod_1.z.object({
    params: zod_1.z.object({
        accountId: zod_1.z.string().min(1, "Account ID is required"),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name is required").optional(),
        description: zod_1.z.string().optional(),
        stripeSecretKey: zod_1.z
            .string()
            .min(1, "Stripe Secret Key is required")
            .optional(),
        isActive: zod_1.z.boolean().optional(),
        isDefaultAccount: zod_1.z.boolean().optional(),
    }),
});
// Get Stripe Account by ID validation
exports.getStripeAccountByIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        accountId: zod_1.z.string().min(1, "Account ID is required"),
    }),
});
// Get Stripe Accounts by Property validation
exports.getStripeAccountsByPropertySchema = zod_1.z.object({
    params: zod_1.z.object({
        propertyId: zod_1.z.string().min(1, "Property ID is required"),
    }),
});
// Get Stripe Account by Property validation (legacy - kept for backward compatibility)
exports.getStripeAccountByPropertySchema = zod_1.z.object({
    params: zod_1.z.object({
        propertyId: zod_1.z.string().min(1, "Property ID is required"),
    }),
});
// Delete Stripe Account validation
exports.deleteStripeAccountSchema = zod_1.z.object({
    params: zod_1.z.object({
        accountId: zod_1.z.string().min(1, "Account ID is required"),
    }),
});
// Verify Stripe Account validation
exports.verifyStripeAccountSchema = zod_1.z.object({
    params: zod_1.z.object({
        accountId: zod_1.z.string().min(1, "Account ID is required"),
    }),
});
// Sync Payment History validation
exports.syncPaymentHistorySchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().min(1, "User ID is required"),
    }),
});
