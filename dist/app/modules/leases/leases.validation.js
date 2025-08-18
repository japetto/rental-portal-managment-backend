"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeasesValidation = exports.deleteLeaseValidationSchema = exports.getLeasesByTenantValidationSchema = exports.getLeaseByIdValidationSchema = exports.updateLeaseValidationSchema = exports.createLeaseValidationSchema = void 0;
const zod_1 = require("zod");
// Pet details validation schema
const petDetailsSchema = zod_1.z.object({
    type: zod_1.z.string().min(1, "Pet type is required"),
    breed: zod_1.z.string().min(1, "Pet breed is required"),
    name: zod_1.z.string().min(1, "Pet name is required"),
    weight: zod_1.z.number().min(0, "Pet weight must be positive"),
});
// RV info validation schema
const rvInfoSchema = zod_1.z.object({
    make: zod_1.z.string().min(1, "RV make is required"),
    model: zod_1.z.string().min(1, "RV model is required"),
    year: zod_1.z
        .number()
        .min(1900, "Invalid year")
        .max(new Date().getFullYear() + 1, "Year cannot be in the future"),
    length: zod_1.z.number().min(1, "RV length must be positive"),
    licensePlate: zod_1.z.string().min(1, "License plate is required"),
});
// Create lease validation schema
exports.createLeaseValidationSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        tenantId: zod_1.z.string().min(1, "Tenant ID is required"),
        spotId: zod_1.z.string().min(1, "Spot ID is required"),
        propertyId: zod_1.z.string().min(1, "Property ID is required"),
        leaseType: zod_1.z.enum(["MONTHLY", "FIXED_TERM"], {
            required_error: "Lease type is required",
            invalid_type_error: "Lease type must be either MONTHLY or FIXED_TERM",
        }),
        leaseStart: zod_1.z.coerce.date({
            required_error: "Lease start date is required",
            invalid_type_error: "Invalid lease start date",
        }),
        leaseEnd: zod_1.z.coerce
            .date({
            invalid_type_error: "Invalid lease end date",
        })
            .optional()
            .refine(date => {
            // For FIXED_TERM leases, end date is required
            return true; // We'll handle this in the service layer
        }),
        rentAmount: zod_1.z.number().min(0, "Rent amount must be positive"),
        additionalRentAmount: zod_1.z
            .number()
            .min(0, "Additional rent amount must be positive")
            .optional(),
        depositAmount: zod_1.z.number().min(0, "Deposit amount must be positive"),
        occupants: zod_1.z.number().int().min(1, "At least one occupant is required"),
        pets: zod_1.z.object({
            hasPets: zod_1.z.boolean(),
            petDetails: zod_1.z.array(petDetailsSchema).optional(),
        }),
        rvInfo: rvInfoSchema,
        specialRequests: zod_1.z.array(zod_1.z.string()).optional(),
        documents: zod_1.z.array(zod_1.z.string().url("Invalid document URL")).optional(),
        notes: zod_1.z.string().optional(),
    })
        .refine(data => {
        // For FIXED_TERM leases, leaseEnd is required
        if (data.leaseType === "FIXED_TERM" && !data.leaseEnd) {
            return false;
        }
        return true;
    }, {
        message: "Lease end date is required for FIXED_TERM leases",
        path: ["leaseEnd"],
    })
        .refine(data => {
        // If leaseEnd is provided, it must be after leaseStart
        if (data.leaseEnd && data.leaseStart >= data.leaseEnd) {
            return false;
        }
        return true;
    }, {
        message: "Lease end date must be after lease start date",
        path: ["leaseEnd"],
    })
        .refine(data => {
        // If hasPets is true, petDetails must be provided
        if (data.pets.hasPets &&
            (!data.pets.petDetails || data.pets.petDetails.length === 0)) {
            return false;
        }
        return true;
    }, {
        message: "Pet details are required when hasPets is true",
        path: ["pets", "petDetails"],
    }),
});
// Update lease validation schema
exports.updateLeaseValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Lease ID is required"),
    }),
    body: zod_1.z
        .object({
        leaseType: zod_1.z.enum(["MONTHLY", "FIXED_TERM"]).optional(),
        leaseStart: zod_1.z.coerce.date().optional(),
        leaseEnd: zod_1.z.coerce.date().optional(),
        rentAmount: zod_1.z.number().min(0, "Rent amount must be positive").optional(),
        additionalRentAmount: zod_1.z
            .number()
            .min(0, "Additional rent amount must be positive")
            .optional(),
        depositAmount: zod_1.z
            .number()
            .min(0, "Deposit amount must be positive")
            .optional(),
        paymentStatus: zod_1.z
            .enum(["PAID", "PENDING", "OVERDUE", "PARTIAL"])
            .optional(),
        leaseStatus: zod_1.z
            .enum(["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"])
            .optional(),
        occupants: zod_1.z
            .number()
            .int()
            .min(1, "At least one occupant is required")
            .optional(),
        pets: zod_1.z
            .object({
            hasPets: zod_1.z.boolean().optional(),
            petDetails: zod_1.z.array(petDetailsSchema).optional(),
        })
            .optional(),
        rvInfo: rvInfoSchema.partial().optional(),
        specialRequests: zod_1.z.array(zod_1.z.string()).optional(),
        documents: zod_1.z.array(zod_1.z.string().url("Invalid document URL")).optional(),
        notes: zod_1.z.string().optional(),
    })
        .refine(data => {
        // If both leaseStart and leaseEnd are provided, leaseEnd must be after leaseStart
        if (data.leaseStart &&
            data.leaseEnd &&
            data.leaseStart >= data.leaseEnd) {
            return false;
        }
        return true;
    }, {
        message: "Lease end date must be after lease start date",
        path: ["leaseEnd"],
    }),
});
// Get lease by ID validation schema
exports.getLeaseByIdValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Lease ID is required"),
    }),
});
// Get leases by tenant validation schema
exports.getLeasesByTenantValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        tenantId: zod_1.z.string().min(1, "Tenant ID is required"),
    }),
    query: zod_1.z.object({
        page: zod_1.z.string().optional(),
        limit: zod_1.z.string().optional(),
        status: zod_1.z.enum(["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"]).optional(),
        leaseType: zod_1.z.enum(["MONTHLY", "FIXED_TERM"]).optional(),
    }),
});
// Delete lease validation schema
exports.deleteLeaseValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Lease ID is required"),
    }),
});
// Export all validation schemas
exports.LeasesValidation = {
    createLeaseValidationSchema: exports.createLeaseValidationSchema,
    updateLeaseValidationSchema: exports.updateLeaseValidationSchema,
    getLeaseByIdValidationSchema: exports.getLeaseByIdValidationSchema,
    getLeasesByTenantValidationSchema: exports.getLeasesByTenantValidationSchema,
    deleteLeaseValidationSchema: exports.deleteLeaseValidationSchema,
};
