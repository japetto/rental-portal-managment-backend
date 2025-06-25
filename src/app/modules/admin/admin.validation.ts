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
    amenities: z.array(z.string()).min(1, "At least one amenity is required"),
    hookups: z.object({
      water: z.boolean(),
      electricity: z.boolean(),
      sewer: z.boolean(),
      wifi: z.boolean(),
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
    amenities: z
      .array(z.string())
      .min(1, "At least one amenity is required")
      .optional(),
    hookups: z
      .object({
        water: z.boolean().optional(),
        electricity: z.boolean().optional(),
        sewer: z.boolean().optional(),
        wifi: z.boolean().optional(),
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
    totalLots: z.number().min(1, "Total lots must be at least 1"),
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
    totalLots: z.number().min(1, "Total lots must be at least 1").optional(),
    isActive: z.boolean().optional(),
    images: z.array(z.string()).optional(),
    rules: z.array(z.string()).optional(),
  }),
});

export const AdminValidation = {
  inviteTenantValidationSchema,
  createSpotValidationSchema,
  updateSpotValidationSchema,
  createPropertyValidationSchema,
  updatePropertyValidationSchema,
};
