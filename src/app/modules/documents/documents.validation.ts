import { z } from "zod";

// Document type enum
const documentTypeEnum = z.enum(["IMAGE", "PDF", "DOC"]);

// Create document validation schema
const createDocumentZodSchema = z.object({
  body: z.object({
    title: z
      .string({
        required_error: "Title is required",
      })
      .min(1, "Title cannot be empty")
      .max(200, "Title cannot exceed 200 characters")
      .trim(),
    description: z
      .string()
      .max(1000, "Description cannot exceed 1000 characters")
      .trim()
      .optional(),
    fileUrl: z
      .string({
        required_error: "File URL is required",
      })
      .url("File URL must be a valid URL"),
    fileType: documentTypeEnum,
    fileName: z
      .string({
        required_error: "File name is required",
      })
      .min(1, "File name cannot be empty")
      .trim(),
    fileSize: z.number().min(0, "File size cannot be negative").optional(),
    propertyId: z
      .string({
        required_error: "Property ID is required",
      })
      .min(1, "Property ID cannot be empty"),
    tags: z
      .array(
        z
          .string()
          .min(1, "Tag cannot be empty")
          .max(50, "Tag cannot exceed 50 characters")
          .trim(),
      )
      .optional(),
    category: z
      .string()
      .max(100, "Category cannot exceed 100 characters")
      .trim()
      .optional(),
    expiryDate: z
      .string()
      .datetime("Expiry date must be a valid date")
      .optional()
      .refine(
        date => {
          if (!date) return true;
          return new Date(date) > new Date();
        },
        {
          message: "Expiry date must be in the future",
        },
      ),
  }),
});

// Update document validation schema
const updateDocumentZodSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(200, "Title cannot exceed 200 characters")
      .trim()
      .optional(),
    description: z
      .string()
      .max(1000, "Description cannot exceed 1000 characters")
      .trim()
      .optional(),
    fileUrl: z.string().url("File URL must be a valid URL").optional(),
    fileType: documentTypeEnum.optional(),
    fileName: z.string().min(1, "File name cannot be empty").trim().optional(),
    fileSize: z.number().min(0, "File size cannot be negative").optional(),
    propertyId: z.string().min(1, "Property ID cannot be empty").optional(),
    tags: z
      .array(
        z
          .string()
          .min(1, "Tag cannot be empty")
          .max(50, "Tag cannot exceed 50 characters")
          .trim(),
      )
      .optional(),
    category: z
      .string()
      .max(100, "Category cannot exceed 100 characters")
      .trim()
      .optional(),
    expiryDate: z
      .string()
      .datetime("Expiry date must be a valid date")
      .optional()
      .refine(
        date => {
          if (!date) return true;
          return new Date(date) > new Date();
        },
        {
          message: "Expiry date must be in the future",
        },
      ),
    isActive: z.boolean().optional(),
  }),
});

// Get documents with filters validation schema
const getDocumentsZodSchema = z.object({
  query: z.object({
    propertyId: z.string().optional(),
    fileType: documentTypeEnum.optional(),
    category: z.string().optional(),
    isActive: z
      .string()
      .transform(val => val === "true")
      .optional(),
    search: z.string().optional(),
    tags: z
      .string()
      .transform(val => val.split(",").map(tag => tag.trim()))
      .optional(),
    uploadedBy: z.string().optional(),
    page: z
      .string()
      .transform(val => parseInt(val, 10))
      .refine(val => !isNaN(val) && val > 0, {
        message: "Page must be a positive number",
      })
      .optional(),
    limit: z
      .string()
      .transform(val => parseInt(val, 10))
      .refine(val => !isNaN(val) && val > 0 && val <= 100, {
        message: "Limit must be a positive number and cannot exceed 100",
      })
      .optional(),
    sortBy: z
      .enum([
        "title",
        "fileType",
        "category",
        "createdAt",
        "updatedAt",
        "fileName",
        "fileSize",
      ])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

// Get document by ID validation schema
const getDocumentByIdZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: "Document ID is required",
      })
      .min(1, "Document ID cannot be empty"),
  }),
});

// Get property documents validation schema
const getPropertyDocumentsZodSchema = z.object({
  params: z.object({
    propertyId: z
      .string({
        required_error: "Property ID is required",
      })
      .min(1, "Property ID cannot be empty"),
  }),
  query: z.object({
    page: z
      .string()
      .transform(val => parseInt(val, 10))
      .refine(val => !isNaN(val) && val > 0, {
        message: "Page must be a positive number",
      })
      .optional(),
    limit: z
      .string()
      .transform(val => parseInt(val, 10))
      .refine(val => !isNaN(val) && val > 0 && val <= 100, {
        message: "Limit must be a positive number and cannot exceed 100",
      })
      .optional(),
    sortBy: z
      .enum([
        "title",
        "fileType",
        "category",
        "createdAt",
        "updatedAt",
        "fileName",
        "fileSize",
      ])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

// Delete document validation schema
const deleteDocumentZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: "Document ID is required",
      })
      .min(1, "Document ID cannot be empty"),
  }),
});

// Get document stats validation schema
const getDocumentStatsZodSchema = z.object({
  query: z.object({
    propertyId: z.string().optional(),
  }),
});

// Get tenant documents validation schema (removed - now uses token user ID)

export const DocumentsValidation = {
  createDocumentZodSchema,
  updateDocumentZodSchema,
  getDocumentsZodSchema,
  getDocumentByIdZodSchema,
  getPropertyDocumentsZodSchema,
  deleteDocumentZodSchema,
  getDocumentStatsZodSchema,
};
