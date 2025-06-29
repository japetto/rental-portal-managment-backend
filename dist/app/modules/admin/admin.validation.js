"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminValidation = exports.adminDeleteUserValidationSchema = exports.adminUpdateUserValidationSchema = exports.adminGetUserValidationSchema = exports.adminGetUrgentServiceRequestsValidationSchema = exports.adminGetServiceRequestsByTenantValidationSchema = exports.adminGetServiceRequestsByPropertyValidationSchema = exports.adminAddCommentValidationSchema = exports.adminUpdateServiceRequestValidationSchema = exports.adminGetServiceRequestValidationSchema = exports.adminGetServiceRequestsValidationSchema = exports.updatePropertyValidationSchema = exports.createPropertyValidationSchema = exports.updateSpotValidationSchema = exports.createSpotValidationSchema = exports.inviteTenantValidationSchema = void 0;
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
// Admin service request validation schemas
exports.adminGetServiceRequestsValidationSchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z
            .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
            .optional(),
        priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        type: zod_1.z
            .enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"])
            .optional(),
        propertyId: zod_1.z.string().optional(),
        tenantId: zod_1.z.string().optional(),
        page: zod_1.z.string().regex(/^\d+$/, "Page must be a number").optional(),
        limit: zod_1.z.string().regex(/^\d+$/, "Limit must be a number").optional(),
        sortBy: zod_1.z.enum(["requestedDate", "priority", "status", "type"]).optional(),
        sortOrder: zod_1.z.enum(["asc", "desc"]).optional(),
    }),
});
exports.adminGetServiceRequestValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Service request ID is required"),
    }),
});
exports.adminUpdateServiceRequestValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Service request ID is required"),
    }),
    body: zod_1.z.object({
        status: zod_1.z
            .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
            .optional(),
        priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        assignedTo: zod_1.z
            .string()
            .max(100, "Assigned to name cannot exceed 100 characters")
            .optional(),
        estimatedCost: zod_1.z
            .number()
            .min(0, "Estimated cost cannot be negative")
            .max(100000, "Estimated cost cannot exceed $100,000")
            .optional(),
        actualCost: zod_1.z
            .number()
            .min(0, "Actual cost cannot be negative")
            .max(100000, "Actual cost cannot exceed $100,000")
            .optional(),
        completedDate: zod_1.z.string().datetime("Invalid date format").optional(),
        adminNotes: zod_1.z
            .string()
            .max(2000, "Admin notes cannot exceed 2000 characters")
            .optional(),
        images: zod_1.z.array(zod_1.z.string().url("Invalid image URL")).optional(),
    }),
});
exports.adminAddCommentValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Service request ID is required"),
    }),
    body: zod_1.z.object({
        comment: zod_1.z
            .string()
            .min(1, "Comment is required")
            .max(1000, "Comment cannot exceed 1000 characters"),
    }),
});
exports.adminGetServiceRequestsByPropertyValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        propertyId: zod_1.z.string().min(1, "Property ID is required"),
    }),
    query: zod_1.z.object({
        status: zod_1.z
            .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
            .optional(),
        priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        type: zod_1.z
            .enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"])
            .optional(),
        page: zod_1.z.string().regex(/^\d+$/, "Page must be a number").optional(),
        limit: zod_1.z.string().regex(/^\d+$/, "Limit must be a number").optional(),
        sortBy: zod_1.z.enum(["requestedDate", "priority", "status", "type"]).optional(),
        sortOrder: zod_1.z.enum(["asc", "desc"]).optional(),
    }),
});
exports.adminGetServiceRequestsByTenantValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        tenantId: zod_1.z.string().min(1, "Tenant ID is required"),
    }),
    query: zod_1.z.object({
        status: zod_1.z
            .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
            .optional(),
        priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        type: zod_1.z
            .enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"])
            .optional(),
        page: zod_1.z.string().regex(/^\d+$/, "Page must be a number").optional(),
        limit: zod_1.z.string().regex(/^\d+$/, "Limit must be a number").optional(),
        sortBy: zod_1.z.enum(["requestedDate", "priority", "status", "type"]).optional(),
        sortOrder: zod_1.z.enum(["asc", "desc"]).optional(),
    }),
});
exports.adminGetUrgentServiceRequestsValidationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/, "Page must be a number").optional(),
        limit: zod_1.z.string().regex(/^\d+$/, "Limit must be a number").optional(),
    }),
});
// Admin User Management Validation Schemas
exports.adminGetUserValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().regex(objectIdRegex, "Invalid user ID format"),
    }),
});
exports.adminUpdateUserValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().regex(objectIdRegex, "Invalid user ID format"),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name is required").optional(),
        phoneNumber: zod_1.z.string().min(1, "Phone number is required").optional(),
        preferredLocation: zod_1.z.string().optional(),
        bio: zod_1.z.string().max(500, "Bio cannot exceed 500 characters").optional(),
        profileImage: zod_1.z.string().url("Invalid image URL").optional(),
        emergencyContact: zod_1.z
            .object({
            name: zod_1.z.string().min(1, "Emergency contact name is required"),
            phone: zod_1.z.string().min(1, "Emergency contact phone is required"),
            relationship: zod_1.z.string().min(1, "Relationship is required"),
        })
            .optional(),
        specialRequests: zod_1.z.array(zod_1.z.string()).optional(),
        role: zod_1.z.enum(["SUPER_ADMIN", "TENANT"]).optional(),
        isVerified: zod_1.z.boolean().optional(),
        isInvited: zod_1.z.boolean().optional(),
    }),
});
exports.adminDeleteUserValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().regex(objectIdRegex, "Invalid user ID format"),
    }),
});
exports.AdminValidation = {
    inviteTenantValidationSchema: exports.inviteTenantValidationSchema,
    createSpotValidationSchema: exports.createSpotValidationSchema,
    updateSpotValidationSchema: exports.updateSpotValidationSchema,
    createPropertyValidationSchema: exports.createPropertyValidationSchema,
    updatePropertyValidationSchema: exports.updatePropertyValidationSchema,
    adminGetServiceRequestsValidationSchema: exports.adminGetServiceRequestsValidationSchema,
    adminGetServiceRequestValidationSchema: exports.adminGetServiceRequestValidationSchema,
    adminUpdateServiceRequestValidationSchema: exports.adminUpdateServiceRequestValidationSchema,
    adminAddCommentValidationSchema: exports.adminAddCommentValidationSchema,
    adminGetServiceRequestsByPropertyValidationSchema: exports.adminGetServiceRequestsByPropertyValidationSchema,
    adminGetServiceRequestsByTenantValidationSchema: exports.adminGetServiceRequestsByTenantValidationSchema,
    adminGetUrgentServiceRequestsValidationSchema: exports.adminGetUrgentServiceRequestsValidationSchema,
    adminGetUserValidationSchema: exports.adminGetUserValidationSchema,
    adminUpdateUserValidationSchema: exports.adminUpdateUserValidationSchema,
    adminDeleteUserValidationSchema: exports.adminDeleteUserValidationSchema,
};
