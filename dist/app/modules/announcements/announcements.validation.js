"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementValidation = exports.markAsReadValidationSchema = exports.getAnnouncementsByPriorityValidationSchema = exports.getAnnouncementsByTypeValidationSchema = exports.getAnnouncementsByPropertyValidationSchema = exports.deleteAnnouncementValidationSchema = exports.getAnnouncementByIdValidationSchema = exports.updateAnnouncementValidationSchema = exports.createAnnouncementValidationSchema = void 0;
const zod_1 = require("zod");
// Create announcement validation schema
exports.createAnnouncementValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z
            .string()
            .min(1, "Title is required")
            .max(200, "Title cannot exceed 200 characters"),
        content: zod_1.z
            .string()
            .min(1, "Content is required")
            .max(5000, "Content cannot exceed 5000 characters"),
        type: zod_1.z.enum([
            "GENERAL",
            "MAINTENANCE",
            "EVENT",
            "EMERGENCY",
            "RULE_UPDATE",
            "BILLING",
            "SECURITY",
            "OTHER",
        ], {
            required_error: "Type is required",
        }),
        priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
        propertyId: zod_1.z.string().optional(),
        expiryDate: zod_1.z.string().datetime().optional(),
        attachments: zod_1.z.array(zod_1.z.string().url("Invalid attachment URL")).optional(),
        targetAudience: zod_1.z
            .enum(["ALL", "TENANTS_ONLY", "ADMINS_ONLY", "PROPERTY_SPECIFIC"])
            .default("ALL"),
        sendNotification: zod_1.z.boolean().optional(),
        tags: zod_1.z.array(zod_1.z.string().trim()).optional(),
    }),
});
// Update announcement validation schema
exports.updateAnnouncementValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z
            .string()
            .min(1, "Title is required")
            .max(200, "Title cannot exceed 200 characters")
            .optional(),
        content: zod_1.z
            .string()
            .min(1, "Content is required")
            .max(5000, "Content cannot exceed 5000 characters")
            .optional(),
        type: zod_1.z
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
        priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        propertyId: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional(),
        expiryDate: zod_1.z.string().datetime().optional(),
        attachments: zod_1.z.array(zod_1.z.string().url("Invalid attachment URL")).optional(),
        targetAudience: zod_1.z
            .enum(["ALL", "TENANTS_ONLY", "ADMINS_ONLY", "PROPERTY_SPECIFIC"])
            .optional(),
        sendNotification: zod_1.z.boolean().optional(),
        tags: zod_1.z.array(zod_1.z.string().trim()).optional(),
    }),
});
// Get announcement by ID validation schema
exports.getAnnouncementByIdValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        announcementId: zod_1.z.string().min(1, "Announcement ID is required"),
    }),
});
// Delete announcement validation schema
exports.deleteAnnouncementValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        announcementId: zod_1.z.string().min(1, "Announcement ID is required"),
    }),
});
// Get announcements by property validation schema
exports.getAnnouncementsByPropertyValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        propertyId: zod_1.z.string().min(1, "Property ID is required"),
    }),
});
// Get announcements by type validation schema
exports.getAnnouncementsByTypeValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        type: zod_1.z.enum([
            "GENERAL",
            "MAINTENANCE",
            "EVENT",
            "EMERGENCY",
            "RULE_UPDATE",
            "BILLING",
            "SECURITY",
            "OTHER",
        ], {
            required_error: "Type is required",
        }),
    }),
});
// Get announcements by priority validation schema
exports.getAnnouncementsByPriorityValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"], {
            required_error: "Priority is required",
        }),
    }),
});
// Mark announcement as read validation schema
exports.markAsReadValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        announcementId: zod_1.z.string().min(1, "Announcement ID is required"),
    }),
});
exports.AnnouncementValidation = {
    createAnnouncementValidationSchema: exports.createAnnouncementValidationSchema,
    updateAnnouncementValidationSchema: exports.updateAnnouncementValidationSchema,
    getAnnouncementByIdValidationSchema: exports.getAnnouncementByIdValidationSchema,
    deleteAnnouncementValidationSchema: exports.deleteAnnouncementValidationSchema,
    getAnnouncementsByPropertyValidationSchema: exports.getAnnouncementsByPropertyValidationSchema,
    getAnnouncementsByTypeValidationSchema: exports.getAnnouncementsByTypeValidationSchema,
    getAnnouncementsByPriorityValidationSchema: exports.getAnnouncementsByPriorityValidationSchema,
    markAsReadValidationSchema: exports.markAsReadValidationSchema,
};
