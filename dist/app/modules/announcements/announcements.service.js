"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const users_schema_1 = require("../users/users.schema");
const announcements_schema_1 = require("./announcements.schema");
// Import soft delete utilities
const SoftDeleteUtils = __importStar(require("../../../shared/softDeleteUtils"));
//* Create Announcement
const createAnnouncement = (payload, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can create announcements");
    }
    const announcementData = Object.assign(Object.assign({}, payload), { createdBy: adminId });
    const announcement = yield announcements_schema_1.Announcements.create(announcementData);
    return announcement;
});
//* Get All Announcements (Admin)
const getAllAnnouncements = (adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view all announcements");
    }
    const announcements = yield announcements_schema_1.Announcements.find({ isDeleted: false })
        .populate({
        path: "propertyId",
        select: "name description address",
    })
        .populate({
        path: "readBy",
        select: "name email",
    })
        .sort({ createdAt: -1 });
    return announcements;
});
//* Get Announcement by ID
const getAnnouncementById = (announcementId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const announcement = yield announcements_schema_1.Announcements.findOne({
        _id: announcementId,
        isDeleted: false,
    })
        .populate({
        path: "propertyId",
        select: "name description address",
    })
        .populate({
        path: "readBy",
        select: "name email",
    });
    if (!announcement) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Announcement not found");
    }
    // If admin is provided, check permissions
    if (adminId) {
        const admin = yield users_schema_1.Users.findById(adminId);
        if (!admin || admin.role !== "SUPER_ADMIN") {
            throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Access denied");
        }
    }
    return announcement;
});
//* Update Announcement
const updateAnnouncement = (announcementId, payload, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can update announcements");
    }
    const announcement = yield announcements_schema_1.Announcements.findById(announcementId);
    if (!announcement) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Announcement not found");
    }
    const updatedAnnouncement = yield announcements_schema_1.Announcements.findByIdAndUpdate(announcementId, payload, { new: true, runValidators: true }).populate({
        path: "propertyId",
        select: "name description address",
    });
    if (!updatedAnnouncement) {
        throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to update announcement");
    }
    return updatedAnnouncement;
});
//* Delete Announcement
const deleteAnnouncement = (announcementId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can delete announcements");
    }
    const announcement = yield announcements_schema_1.Announcements.findById(announcementId);
    if (!announcement) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Announcement not found");
    }
    yield SoftDeleteUtils.softDelete(announcements_schema_1.Announcements, announcementId, adminId);
    return {
        message: "Announcement archived successfully",
    };
});
// Archive an announcement (soft delete)
const archiveAnnouncement = (announcementId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can archive announcements");
    }
    const announcement = yield announcements_schema_1.Announcements.findOne({
        _id: announcementId,
        isDeleted: false,
    });
    if (!announcement) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Announcement not found");
    }
    yield SoftDeleteUtils.softDelete(announcements_schema_1.Announcements, announcementId, adminId);
    return {
        message: "Announcement archived successfully",
    };
});
// Restore an announcement
const restoreAnnouncement = (announcementId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can restore announcements");
    }
    const announcement = yield announcements_schema_1.Announcements.findOne({
        _id: announcementId,
        isDeleted: true,
    });
    if (!announcement) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Announcement not found or not archived");
    }
    yield SoftDeleteUtils.restoreRecord(announcements_schema_1.Announcements, announcementId, adminId);
    return {
        message: "Announcement restored successfully",
    };
});
// Get archived announcements
const getArchivedAnnouncements = (adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view archived announcements");
    }
    const archivedAnnouncements = yield announcements_schema_1.Announcements.find({ isDeleted: true })
        .populate({
        path: "propertyId",
        select: "name description address",
    })
        .populate({
        path: "readBy",
        select: "name email",
    })
        .sort({ deletedAt: -1 });
    return archivedAnnouncements;
});
//* Get Announcements by Property
const getAnnouncementsByProperty = (propertyId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view property announcements");
    }
    const announcements = yield announcements_schema_1.Announcements.find({
        isDeleted: false,
        $or: [
            { propertyId: propertyId },
            { propertyId: null }, // System-wide announcements
        ],
    })
        .populate({
        path: "propertyId",
        select: "name description address",
    })
        .populate({
        path: "readBy",
        select: "name email",
    })
        .sort({ createdAt: -1 });
    return announcements;
});
//* Get Announcements by Type
const getAnnouncementsByType = (type, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can filter announcements");
    }
    const announcements = yield announcements_schema_1.Announcements.find({ type, isDeleted: false })
        .populate({
        path: "propertyId",
        select: "name description address",
    })
        .populate({
        path: "readBy",
        select: "name email",
    })
        .sort({ createdAt: -1 });
    return announcements;
});
//* Get Announcements by Priority
const getAnnouncementsByPriority = (priority, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can filter announcements");
    }
    const announcements = yield announcements_schema_1.Announcements.find({ priority, isDeleted: false })
        .populate({
        path: "propertyId",
        select: "name description address",
    })
        .populate({
        path: "readBy",
        select: "name email",
    })
        .sort({ createdAt: -1 });
    return announcements;
});
//* Get Tenant Announcements (for tenants to get their announcements)
const getTenantAnnouncements = (tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = yield users_schema_1.Users.findById(tenantId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // Get user's property ID
    const userPropertyId = (_a = user.propertyId) === null || _a === void 0 ? void 0 : _a.toString();
    // Build the query for announcements that are relevant to this tenant
    const baseQuery = {
        isDeleted: false, // Only get non-deleted announcements
        isActive: true, // Only get active announcements
        $or: [
            { expiryDate: { $exists: false } }, // No expiry date set
            { expiryDate: { $gt: new Date() } }, // Expiry date is in the future
        ],
    };
    // Build target audience conditions
    const targetAudienceConditions = [
        { targetAudience: "ALL" },
        { targetAudience: "TENANTS_ONLY" },
    ];
    // Include PROPERTY_SPECIFIC announcements for user's property
    if (userPropertyId) {
        targetAudienceConditions.push({
            $and: [
                { targetAudience: "PROPERTY_SPECIFIC" },
                { propertyId: userPropertyId },
            ],
        });
    }
    // Combine all conditions
    const query = Object.assign(Object.assign({}, baseQuery), { $and: [{ $or: targetAudienceConditions }] });
    const announcements = yield announcements_schema_1.Announcements.find(query)
        .populate({
        path: "propertyId",
        select: "name description address",
    })
        .sort({ priority: -1, createdAt: -1 });
    return announcements;
});
//* Get Announcement by ID for Tenant (with proper access control and expiry filtering)
const getTenantAnnouncementById = (announcementId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Verify the user exists
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // Get user's property ID
    const userPropertyId = (_a = user.propertyId) === null || _a === void 0 ? void 0 : _a.toString();
    // Build the query for announcements that are relevant to this tenant
    const baseQuery = {
        _id: announcementId,
        isDeleted: false, // Only get non-deleted announcements
        isActive: true, // Only get active announcements
        $or: [
            { expiryDate: { $exists: false } }, // No expiry date set
            { expiryDate: { $gt: new Date() } }, // Expiry date is in the future
        ],
    };
    // Build target audience conditions
    const targetAudienceConditions = [
        { targetAudience: "ALL" },
        { targetAudience: "TENANTS_ONLY" },
    ];
    // Include PROPERTY_SPECIFIC announcements for user's property
    if (userPropertyId) {
        targetAudienceConditions.push({
            $and: [
                { targetAudience: "PROPERTY_SPECIFIC" },
                { propertyId: userPropertyId },
            ],
        });
    }
    // Combine all conditions
    const query = Object.assign(Object.assign({}, baseQuery), { $and: [{ $or: targetAudienceConditions }] });
    const announcement = yield announcements_schema_1.Announcements.findOne(query)
        .populate({
        path: "propertyId",
        select: "name description address",
    })
        .populate({
        path: "readBy",
        select: "name email",
    });
    if (!announcement) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Announcement not found");
    }
    return announcement;
});
//* Mark announcement as read for a user
const markAsRead = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, announcementId } = data;
    // Validate user exists
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // Validate announcement exists and is not expired
    const announcement = yield announcements_schema_1.Announcements.findById(announcementId);
    if (!announcement) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Announcement not found");
    }
    // Check if announcement is expired
    if (announcement.expiryDate && new Date() > announcement.expiryDate) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Announcement not found");
    }
    // Check if user has already read this announcement
    if (announcement.readBy.includes(userId)) {
        return announcement;
    }
    // Add user to readBy array
    const updatedAnnouncement = yield announcements_schema_1.Announcements.findByIdAndUpdate(announcementId, {
        $addToSet: { readBy: userId },
    }, { new: true }).populate({
        path: "propertyId",
        select: "name description address",
    });
    if (!updatedAnnouncement) {
        throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to mark announcement as read");
    }
    return updatedAnnouncement;
});
exports.AnnouncementService = {
    createAnnouncement,
    getAllAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    getAnnouncementsByProperty,
    getAnnouncementsByType,
    getAnnouncementsByPriority,
    archiveAnnouncement,
    restoreAnnouncement,
    getArchivedAnnouncements,
    getTenantAnnouncements,
    getTenantAnnouncementById,
    markAsRead,
};
