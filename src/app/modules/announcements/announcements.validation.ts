import { z } from "zod";

// Create announcement validation schema
export const createAnnouncementValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title cannot exceed 200 characters"),
    content: z
      .string()
      .min(1, "Content is required")
      .max(5000, "Content cannot exceed 5000 characters"),
    type: z.enum(
      [
        "GENERAL",
        "MAINTENANCE",
        "EVENT",
        "EMERGENCY",
        "RULE_UPDATE",
        "BILLING",
        "SECURITY",
        "OTHER",
      ],
      {
        required_error: "Type is required",
      },
    ),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    propertyId: z.string().optional(),
    expiryDate: z.string().datetime().optional(),
    attachments: z.array(z.string().url("Invalid attachment URL")).optional(),
    targetAudience: z
      .enum(["ALL", "TENANTS_ONLY", "ADMINS_ONLY", "PROPERTY_SPECIFIC"])
      .default("ALL"),
    sendNotification: z.boolean().default(true),
    tags: z.array(z.string().trim()).optional(),
  }),
});

// Update announcement validation schema
export const updateAnnouncementValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title cannot exceed 200 characters")
      .optional(),
    content: z
      .string()
      .min(1, "Content is required")
      .max(5000, "Content cannot exceed 5000 characters")
      .optional(),
    type: z
      .enum([
        "GENERAL",
        "MAINTENANCE",
        "EVENT",
        "EMERGENCY",
        "RULE_UPDATE",
        "BILLING",
        "SECURITY",
        "OTHER",
      ])
      .optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    propertyId: z.string().optional(),
    isActive: z.boolean().optional(),
    expiryDate: z.string().datetime().optional(),
    attachments: z.array(z.string().url("Invalid attachment URL")).optional(),
    targetAudience: z
      .enum(["ALL", "TENANTS_ONLY", "ADMINS_ONLY", "PROPERTY_SPECIFIC"])
      .optional(),
    sendNotification: z.boolean().optional(),
    tags: z.array(z.string().trim()).optional(),
  }),
});

// Mark as read validation schema
export const markAsReadValidationSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    announcementId: z.string().min(1, "Announcement ID is required"),
  }),
});

// Get announcement by ID validation schema
export const getAnnouncementByIdValidationSchema = z.object({
  params: z.object({
    announcementId: z.string().min(1, "Announcement ID is required"),
  }),
});

// Delete announcement validation schema
export const deleteAnnouncementValidationSchema = z.object({
  params: z.object({
    announcementId: z.string().min(1, "Announcement ID is required"),
  }),
});

// Get announcements by property validation schema
export const getAnnouncementsByPropertyValidationSchema = z.object({
  params: z.object({
    propertyId: z.string().min(1, "Property ID is required"),
  }),
});

// Get announcements by type validation schema
export const getAnnouncementsByTypeValidationSchema = z.object({
  params: z.object({
    type: z.enum(
      [
        "GENERAL",
        "MAINTENANCE",
        "EVENT",
        "EMERGENCY",
        "RULE_UPDATE",
        "BILLING",
        "SECURITY",
        "OTHER",
      ],
      {
        required_error: "Type is required",
      },
    ),
  }),
});

// Get announcements by priority validation schema
export const getAnnouncementsByPriorityValidationSchema = z.object({
  params: z.object({
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"], {
      required_error: "Priority is required",
    }),
  }),
});

// Get unread announcements validation schema
export const getUnreadAnnouncementsValidationSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
  query: z.object({
    propertyId: z.string().optional(),
  }),
});

export const AnnouncementValidation = {
  createAnnouncementValidationSchema,
  updateAnnouncementValidationSchema,
  markAsReadValidationSchema,
  getAnnouncementByIdValidationSchema,
  deleteAnnouncementValidationSchema,
  getAnnouncementsByPropertyValidationSchema,
  getAnnouncementsByTypeValidationSchema,
  getAnnouncementsByPriorityValidationSchema,
  getUnreadAnnouncementsValidationSchema,
};
