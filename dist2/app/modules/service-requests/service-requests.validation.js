"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRequestValidation = exports.deleteServiceRequestValidationSchema = exports.getServiceRequestsValidationSchema = exports.getServiceRequestValidationSchema = exports.adminUpdateServiceRequestValidationSchema = exports.updateServiceRequestValidationSchema = exports.createServiceRequestValidationSchema = void 0;
const zod_1 = require("zod");
// Create service request validation
exports.createServiceRequestValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z
            .string()
            .min(1, "Title is required")
            .max(100, "Title cannot exceed 100 characters"),
        description: zod_1.z
            .string()
            .min(1, "Description is required")
            .max(1000, "Description cannot exceed 1000 characters"),
        type: zod_1.z.enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"], {
            errorMap: () => ({
                message: "Type must be one of: MAINTENANCE, UTILITY, SECURITY, CLEANING, OTHER",
            }),
        }),
        priority: zod_1.z
            .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
            .optional()
            .default("MEDIUM"),
        images: zod_1.z.array(zod_1.z.string().url("Invalid image URL")).optional(),
        tenantNotes: zod_1.z
            .string()
            .max(2000, "Tenant notes cannot exceed 2000 characters")
            .optional(),
    }),
});
// Update service request validation (for tenants)
exports.updateServiceRequestValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Service request ID is required"),
    }),
    body: zod_1.z.object({
        title: zod_1.z
            .string()
            .min(1, "Title is required")
            .max(100, "Title cannot exceed 100 characters")
            .optional(),
        description: zod_1.z
            .string()
            .min(1, "Description is required")
            .max(1000, "Description cannot exceed 1000 characters")
            .optional(),
        type: zod_1.z
            .enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"])
            .optional(),
        priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        images: zod_1.z.array(zod_1.z.string().url("Invalid image URL")).optional(),
        tenantNotes: zod_1.z
            .string()
            .max(2000, "Tenant notes cannot exceed 2000 characters")
            .optional(),
    }),
});
// Admin update service request validation
exports.adminUpdateServiceRequestValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Service request ID is required"),
    }),
    body: zod_1.z.object({
        title: zod_1.z
            .string()
            .min(1, "Title is required")
            .max(100, "Title cannot exceed 100 characters")
            .optional(),
        description: zod_1.z
            .string()
            .min(1, "Description is required")
            .max(1000, "Description cannot exceed 1000 characters")
            .optional(),
        type: zod_1.z
            .enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"])
            .optional(),
        priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        status: zod_1.z
            .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
            .optional(),
        completedDate: zod_1.z.string().datetime("Invalid date format").optional(),
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
        images: zod_1.z.array(zod_1.z.string().url("Invalid image URL")).optional(),
        adminNotes: zod_1.z
            .string()
            .max(2000, "Admin notes cannot exceed 2000 characters")
            .optional(),
        tenantNotes: zod_1.z
            .string()
            .max(2000, "Tenant notes cannot exceed 2000 characters")
            .optional(),
    }),
});
// Get service request by ID validation
exports.getServiceRequestValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Service request ID is required"),
    }),
});
// Get service requests with filters validation
exports.getServiceRequestsValidationSchema = zod_1.z.object({
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
// Delete service request validation
exports.deleteServiceRequestValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Service request ID is required"),
    }),
});
exports.ServiceRequestValidation = {
    createServiceRequestValidationSchema: exports.createServiceRequestValidationSchema,
    updateServiceRequestValidationSchema: exports.updateServiceRequestValidationSchema,
    adminUpdateServiceRequestValidationSchema: exports.adminUpdateServiceRequestValidationSchema,
    getServiceRequestValidationSchema: exports.getServiceRequestValidationSchema,
    getServiceRequestsValidationSchema: exports.getServiceRequestsValidationSchema,
    deleteServiceRequestValidationSchema: exports.deleteServiceRequestValidationSchema,
};
