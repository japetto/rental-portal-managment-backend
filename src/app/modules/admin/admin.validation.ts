import { z } from "zod";

// Custom ObjectId validation
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const inviteTenantValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    propertyId: z.string().regex(objectIdRegex, "Invalid property ID format"),
    spotId: z.string().regex(objectIdRegex, "Invalid spot ID format"),
    preferredLocation: z.string().optional(),
  }),
});

export const createSpotValidationSchema = z.object({
  body: z.object({
    spotNumber: z.string().min(1, "Spot number is required"),
    propertyId: z.string().regex(objectIdRegex, "Invalid property ID format"),
    size: z.object({
      length: z.number().min(1, "Length must be at least 1 foot"),
      width: z.number().min(1, "Width must be at least 1 foot"),
    }),
    price: z.object({
      daily: z.number().min(0, "Daily price must be non-negative"),
      weekly: z.number().min(0, "Weekly price must be non-negative"),
      monthly: z.number().min(0, "Monthly price must be non-negative"),
    }),
    description: z.string().min(1, "Description is required"),
    images: z.array(z.string()).optional(),
  }),
});

export const updateSpotValidationSchema = z.object({
  body: z.object({
    spotNumber: z.string().min(1, "Spot number is required").optional(),
    status: z
      .enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "RESERVED"])
      .optional(),
    size: z
      .object({
        length: z.number().min(1, "Length must be at least 1 foot").optional(),
        width: z.number().min(1, "Width must be at least 1 foot").optional(),
      })
      .optional(),
    price: z
      .object({
        daily: z.number().min(0, "Daily price must be non-negative").optional(),
        weekly: z
          .number()
          .min(0, "Weekly price must be non-negative")
          .optional(),
        monthly: z
          .number()
          .min(0, "Monthly price must be non-negative")
          .optional(),
      })
      .optional(),
    description: z.string().min(1, "Description is required").optional(),
    images: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const createPropertyValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Property name is required"),
    description: z.string().min(1, "Property description is required"),
    address: z.object({
      street: z.string().min(1, "Street address is required"),
      city: z.string().min(1, "City is required"),
      state: z.string().min(1, "State is required"),
      zip: z.string().min(1, "ZIP code is required"),
      country: z.string().min(1, "Country is required"),
    }),
    amenities: z.array(z.string()).min(1, "At least one amenity is required"),
    images: z.array(z.string()).optional(),
    rules: z.array(z.string()).optional(),
  }),
});

export const updatePropertyValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Property name is required").optional(),
    description: z
      .string()
      .min(1, "Property description is required")
      .optional(),
    address: z
      .object({
        street: z.string().min(1, "Street address is required").optional(),
        city: z.string().min(1, "City is required").optional(),
        state: z.string().min(1, "State is required").optional(),
        zip: z.string().min(1, "ZIP code is required").optional(),
        country: z.string().min(1, "Country is required").optional(),
      })
      .optional(),
    amenities: z
      .array(z.string())
      .min(1, "At least one amenity is required")
      .optional(),
    images: z.array(z.string()).optional(),
    rules: z.array(z.string()).optional(),
  }),
});

// Admin service request validation schemas
export const adminGetServiceRequestsValidationSchema = z.object({
  query: z.object({
    status: z
      .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    type: z
      .enum(["MAINTENANCE", "UTILITY", "SECURITY", "CLEANING", "OTHER"])
      .optional(),
    propertyId: z.string().optional(),
    tenantId: z.string().optional(),
    page: z.string().regex(/^\d+$/, "Page must be a number").optional(),
    limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
    sortBy: z.enum(["requestedDate", "priority", "status", "type"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const adminGetServiceRequestValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Service request ID is required"),
  }),
});

export const adminUpdateServiceRequestValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Service request ID is required"),
  }),
  body: z.object({
    status: z
      .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
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
    completedDate: z.string().datetime("Invalid date format").optional(),
    adminNotes: z
      .string()
      .max(2000, "Admin notes cannot exceed 2000 characters")
      .optional(),
    images: z.array(z.string().url("Invalid image URL")).optional(),
  }),
});

export const adminAddCommentValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Service request ID is required"),
  }),
  body: z.object({
    comment: z
      .string()
      .min(1, "Comment is required")
      .max(1000, "Comment cannot exceed 1000 characters"),
  }),
});

export const adminGetServiceRequestsByPropertyValidationSchema = z.object({
  params: z.object({
    propertyId: z.string().min(1, "Property ID is required"),
  }),
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

export const adminGetServiceRequestsByTenantValidationSchema = z.object({
  params: z.object({
    tenantId: z.string().min(1, "Tenant ID is required"),
  }),
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

export const adminGetUrgentServiceRequestsValidationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, "Page must be a number").optional(),
    limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
  }),
});

// Admin User Management Validation Schemas
export const adminGetUserValidationSchema = z.object({
  params: z.object({
    userId: z.string().regex(objectIdRegex, "Invalid user ID format"),
  }),
});

export const adminUpdateUserValidationSchema = z.object({
  params: z.object({
    userId: z.string().regex(objectIdRegex, "Invalid user ID format"),
  }),
  body: z.object({
    name: z.string().min(1, "Name is required").optional(),
    phoneNumber: z.string().min(1, "Phone number is required").optional(),
    preferredLocation: z.string().optional(),
    bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
    profileImage: z.string().url("Invalid image URL").optional(),
    emergencyContact: z
      .object({
        name: z.string().min(1, "Emergency contact name is required"),
        phone: z.string().min(1, "Emergency contact phone is required"),
        relationship: z.string().min(1, "Relationship is required"),
      })
      .optional(),
    specialRequests: z.array(z.string()).optional(),
    role: z.enum(["SUPER_ADMIN", "TENANT"]).optional(),
    isVerified: z.boolean().optional(),
    isInvited: z.boolean().optional(),
  }),
});

export const adminDeleteUserValidationSchema = z.object({
  params: z.object({
    userId: z.string().regex(objectIdRegex, "Invalid user ID format"),
  }),
});

export const AdminValidation = {
  inviteTenantValidationSchema,
  createSpotValidationSchema,
  updateSpotValidationSchema,
  createPropertyValidationSchema,
  updatePropertyValidationSchema,
  adminGetServiceRequestsValidationSchema,
  adminGetServiceRequestValidationSchema,
  adminUpdateServiceRequestValidationSchema,
  adminAddCommentValidationSchema,
  adminGetServiceRequestsByPropertyValidationSchema,
  adminGetServiceRequestsByTenantValidationSchema,
  adminGetUrgentServiceRequestsValidationSchema,
  adminGetUserValidationSchema,
  adminUpdateUserValidationSchema,
  adminDeleteUserValidationSchema,
};
