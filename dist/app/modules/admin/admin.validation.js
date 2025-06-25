"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminValidation = exports.updatePropertyValidationSchema = exports.createPropertyValidationSchema = exports.updateSpotValidationSchema = exports.createSpotValidationSchema = exports.inviteTenantValidationSchema = void 0;
const zod_1 = require("zod");
// Custom ObjectId validation
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
exports.inviteTenantValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name is required"),
        email: zod_1.z.string().email("Invalid email format"),
        phoneNumber: zod_1.z.string().min(1, "Phone number is required"),
        propertyId: zod_1.z.string().regex(objectIdRegex, "Invalid property ID format"),
        spotId: zod_1.z.string().regex(objectIdRegex, "Invalid spot ID format"),
        preferredLocation: zod_1.z.string().optional(),
    }),
});
exports.createSpotValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        spotNumber: zod_1.z.string().min(1, "Spot number is required"),
        propertyId: zod_1.z.string().regex(objectIdRegex, "Invalid property ID format"),
        size: zod_1.z.object({
            length: zod_1.z.number().min(1, "Length must be at least 1 foot"),
            width: zod_1.z.number().min(1, "Width must be at least 1 foot"),
        }),
        amenities: zod_1.z.array(zod_1.z.string()).min(1, "At least one amenity is required"),
        hookups: zod_1.z.object({
            water: zod_1.z.boolean(),
            electricity: zod_1.z.boolean(),
            sewer: zod_1.z.boolean(),
            wifi: zod_1.z.boolean(),
        }),
        price: zod_1.z.object({
            daily: zod_1.z.number().min(0, "Daily price must be non-negative"),
            weekly: zod_1.z.number().min(0, "Weekly price must be non-negative"),
            monthly: zod_1.z.number().min(0, "Monthly price must be non-negative"),
        }),
        description: zod_1.z.string().min(1, "Description is required"),
        images: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
exports.updateSpotValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        spotNumber: zod_1.z.string().min(1, "Spot number is required").optional(),
        status: zod_1.z
            .enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "RESERVED"])
            .optional(),
        size: zod_1.z
            .object({
            length: zod_1.z.number().min(1, "Length must be at least 1 foot").optional(),
            width: zod_1.z.number().min(1, "Width must be at least 1 foot").optional(),
        })
            .optional(),
        amenities: zod_1.z
            .array(zod_1.z.string())
            .min(1, "At least one amenity is required")
            .optional(),
        hookups: zod_1.z
            .object({
            water: zod_1.z.boolean().optional(),
            electricity: zod_1.z.boolean().optional(),
            sewer: zod_1.z.boolean().optional(),
            wifi: zod_1.z.boolean().optional(),
        })
            .optional(),
        price: zod_1.z
            .object({
            daily: zod_1.z.number().min(0, "Daily price must be non-negative").optional(),
            weekly: zod_1.z
                .number()
                .min(0, "Weekly price must be non-negative")
                .optional(),
            monthly: zod_1.z
                .number()
                .min(0, "Monthly price must be non-negative")
                .optional(),
        })
            .optional(),
        description: zod_1.z.string().min(1, "Description is required").optional(),
        images: zod_1.z.array(zod_1.z.string()).optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.createPropertyValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Property name is required"),
        description: zod_1.z.string().min(1, "Property description is required"),
        address: zod_1.z.object({
            street: zod_1.z.string().min(1, "Street address is required"),
            city: zod_1.z.string().min(1, "City is required"),
            state: zod_1.z.string().min(1, "State is required"),
            zip: zod_1.z.string().min(1, "ZIP code is required"),
            country: zod_1.z.string().min(1, "Country is required"),
        }),
        amenities: zod_1.z.array(zod_1.z.string()).min(1, "At least one amenity is required"),
        totalLots: zod_1.z.number().min(1, "Total lots must be at least 1"),
        images: zod_1.z.array(zod_1.z.string()).optional(),
        rules: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
exports.updatePropertyValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Property name is required").optional(),
        description: zod_1.z
            .string()
            .min(1, "Property description is required")
            .optional(),
        address: zod_1.z
            .object({
            street: zod_1.z.string().min(1, "Street address is required").optional(),
            city: zod_1.z.string().min(1, "City is required").optional(),
            state: zod_1.z.string().min(1, "State is required").optional(),
            zip: zod_1.z.string().min(1, "ZIP code is required").optional(),
            country: zod_1.z.string().min(1, "Country is required").optional(),
        })
            .optional(),
        amenities: zod_1.z
            .array(zod_1.z.string())
            .min(1, "At least one amenity is required")
            .optional(),
        totalLots: zod_1.z.number().min(1, "Total lots must be at least 1").optional(),
        isActive: zod_1.z.boolean().optional(),
        images: zod_1.z.array(zod_1.z.string()).optional(),
        rules: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
exports.AdminValidation = {
    inviteTenantValidationSchema: exports.inviteTenantValidationSchema,
    createSpotValidationSchema: exports.createSpotValidationSchema,
    updateSpotValidationSchema: exports.updateSpotValidationSchema,
    createPropertyValidationSchema: exports.createPropertyValidationSchema,
    updatePropertyValidationSchema: exports.updatePropertyValidationSchema,
};
