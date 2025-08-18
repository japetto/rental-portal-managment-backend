import { z } from "zod";

// Pet details validation schema
const petDetailsSchema = z.object({
  type: z.string().min(1, "Pet type is required"),
  breed: z.string().min(1, "Pet breed is required"),
  name: z.string().min(1, "Pet name is required"),
  weight: z.number().min(0, "Pet weight must be positive"),
});

// RV info validation schema
const rvInfoSchema = z.object({
  make: z.string().min(1, "RV make is required"),
  model: z.string().min(1, "RV model is required"),
  year: z
    .number()
    .min(1900, "Invalid year")
    .max(new Date().getFullYear() + 1, "Year cannot be in the future"),
  length: z.number().min(1, "RV length must be positive"),
  licensePlate: z.string().min(1, "License plate is required"),
});

// Create lease validation schema
export const createLeaseValidationSchema = z.object({
  body: z
    .object({
      tenantId: z.string().min(1, "Tenant ID is required"),
      spotId: z.string().min(1, "Spot ID is required"),
      propertyId: z.string().min(1, "Property ID is required"),
      leaseType: z.enum(["MONTHLY", "FIXED_TERM"], {
        required_error: "Lease type is required",
        invalid_type_error: "Lease type must be either MONTHLY or FIXED_TERM",
      }),
      leaseStart: z.coerce.date({
        required_error: "Lease start date is required",
        invalid_type_error: "Invalid lease start date",
      }),
      leaseEnd: z.coerce
        .date({
          invalid_type_error: "Invalid lease end date",
        })
        .optional()
        .refine(date => {
          // For FIXED_TERM leases, end date is required
          return true; // We'll handle this in the service layer
        }),
      rentAmount: z.number().min(0, "Rent amount must be positive"),
      additionalRentAmount: z
        .number()
        .min(0, "Additional rent amount must be positive")
        .optional(),
      depositAmount: z.number().min(0, "Deposit amount must be positive"),
      occupants: z.number().int().min(1, "At least one occupant is required"),
      pets: z.object({
        hasPets: z.boolean(),
        petDetails: z.array(petDetailsSchema).optional(),
      }),
      rvInfo: rvInfoSchema,
      specialRequests: z.array(z.string()).optional(),
      documents: z.array(z.string().url("Invalid document URL")).optional(),
      notes: z.string().optional(),
    })
    .refine(
      data => {
        // For FIXED_TERM leases, leaseEnd is required
        if (data.leaseType === "FIXED_TERM" && !data.leaseEnd) {
          return false;
        }
        return true;
      },
      {
        message: "Lease end date is required for FIXED_TERM leases",
        path: ["leaseEnd"],
      },
    )
    .refine(
      data => {
        // If leaseEnd is provided, it must be after leaseStart
        if (data.leaseEnd && data.leaseStart >= data.leaseEnd) {
          return false;
        }
        return true;
      },
      {
        message: "Lease end date must be after lease start date",
        path: ["leaseEnd"],
      },
    )
    .refine(
      data => {
        // If hasPets is true, petDetails must be provided
        if (
          data.pets.hasPets &&
          (!data.pets.petDetails || data.pets.petDetails.length === 0)
        ) {
          return false;
        }
        return true;
      },
      {
        message: "Pet details are required when hasPets is true",
        path: ["pets", "petDetails"],
      },
    ),
});

// Update lease validation schema
export const updateLeaseValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Lease ID is required"),
  }),
  body: z
    .object({
      leaseType: z.enum(["MONTHLY", "FIXED_TERM"]).optional(),
      leaseStart: z.coerce.date().optional(),
      leaseEnd: z.coerce.date().optional(),
      rentAmount: z.number().min(0, "Rent amount must be positive").optional(),
      additionalRentAmount: z
        .number()
        .min(0, "Additional rent amount must be positive")
        .optional(),
      depositAmount: z
        .number()
        .min(0, "Deposit amount must be positive")
        .optional(),
      paymentStatus: z
        .enum(["PAID", "PENDING", "OVERDUE", "PARTIAL"])
        .optional(),
      leaseStatus: z
        .enum(["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"])
        .optional(),
      occupants: z
        .number()
        .int()
        .min(1, "At least one occupant is required")
        .optional(),
      pets: z
        .object({
          hasPets: z.boolean().optional(),
          petDetails: z.array(petDetailsSchema).optional(),
        })
        .optional(),
      rvInfo: rvInfoSchema.partial().optional(),
      specialRequests: z.array(z.string()).optional(),
      documents: z.array(z.string().url("Invalid document URL")).optional(),
      notes: z.string().optional(),
    })
    .refine(
      data => {
        // If both leaseStart and leaseEnd are provided, leaseEnd must be after leaseStart
        if (
          data.leaseStart &&
          data.leaseEnd &&
          data.leaseStart >= data.leaseEnd
        ) {
          return false;
        }
        return true;
      },
      {
        message: "Lease end date must be after lease start date",
        path: ["leaseEnd"],
      },
    ),
});

// Get lease by ID validation schema
export const getLeaseByIdValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Lease ID is required"),
  }),
});

// Get leases by tenant validation schema
export const getLeasesByTenantValidationSchema = z.object({
  params: z.object({
    tenantId: z.string().min(1, "Tenant ID is required"),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"]).optional(),
    leaseType: z.enum(["MONTHLY", "FIXED_TERM"]).optional(),
  }),
});

// Delete lease validation schema
export const deleteLeaseValidationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Lease ID is required"),
  }),
});

// Export all validation schemas
export const LeasesValidation = {
  createLeaseValidationSchema,
  updateLeaseValidationSchema,
  getLeaseByIdValidationSchema,
  getLeasesByTenantValidationSchema,
  deleteLeaseValidationSchema,
};
