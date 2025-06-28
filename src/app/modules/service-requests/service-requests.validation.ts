import { z } from "zod";

// Create service request validation
export const createServiceRequestValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title cannot exceed 100 characters"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(1000, "Description cannot exceed 1000 characters"),
    type: z.enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"], {
      errorMap: () => ({
        message:
          "Type must be one of: MAINTENANCE, UTILITY, SECURITY, CLEANING, OTHER",
      }),
    }),
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .optional()
      .default("MEDIUM"),
    images: z.array(z.string().url("Invalid image URL")).optional(),
    tenantNotes: z
      .string()
      .max(2000, "Tenant notes cannot exceed 2000 characters")
      .optional(),
  }),
});

// Update service request validation (for tenants)
export const updateServiceRequestValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Service request ID is required"),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title cannot exceed 100 characters")
      .optional(),
    description: z
      .string()
      .min(1, "Description is required")
      .max(1000, "Description cannot exceed 1000 characters")
      .optional(),
    type: z
      .enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    images: z.array(z.string().url("Invalid image URL")).optional(),
    tenantNotes: z
      .string()
      .max(2000, "Tenant notes cannot exceed 2000 characters")
      .optional(),
  }),
});

// Admin update service request validation
export const adminUpdateServiceRequestValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Service request ID is required"),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title cannot exceed 100 characters")
      .optional(),
    description: z
      .string()
      .min(1, "Description is required")
      .max(1000, "Description cannot exceed 1000 characters")
      .optional(),
    type: z
      .enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    status: z
      .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
      .optional(),
    completedDate: z.string().datetime("Invalid date format").optional(),
    assignedTo: z
      .string()
      .max(100, "Assigned to name cannot exceed 100 characters")
      .optional(),
    estimatedCost: z
      .number()
      .min(0, "Estimated cost cannot be negative")
      .max(100000, "Estimated cost cannot exceed $100,000")
      .optional(),
    actualCost: z
      .number()
      .min(0, "Actual cost cannot be negative")
      .max(100000, "Actual cost cannot exceed $100,000")
      .optional(),
    images: z.array(z.string().url("Invalid image URL")).optional(),
    adminNotes: z
      .string()
      .max(2000, "Admin notes cannot exceed 2000 characters")
      .optional(),
    tenantNotes: z
      .string()
      .max(2000, "Tenant notes cannot exceed 2000 characters")
      .optional(),
  }),
});

// Get service request by ID validation
export const getServiceRequestValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Service request ID is required"),
  }),
});

// Get service requests with filters validation
export const getServiceRequestsValidationSchema = z.object({
  query: z.object({
    status: z
      .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    type: z
      .enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"])
      .optional(),
    page: z.string().regex(/^\d+$/, "Page must be a number").optional(),
    limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
    sortBy: z.enum(["requestedDate", "priority", "status", "type"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

// Delete service request validation
export const deleteServiceRequestValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Service request ID is required"),
  }),
});

export const ServiceRequestValidation = {
  createServiceRequestValidationSchema,
  updateServiceRequestValidationSchema,
  adminUpdateServiceRequestValidationSchema,
  getServiceRequestValidationSchema,
  getServiceRequestsValidationSchema,
  deleteServiceRequestValidationSchema,
};
