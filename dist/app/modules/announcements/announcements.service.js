"use strict";
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
    const announcements = yield announcements_schema_1.Announcements.find({})
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
//* Get Active Announcements (Public - for tenants)
const getActiveAnnouncements = (userId, propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    const query = {
        isActive: true,
        publishDate: { $lte: new Date() },
        $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
    };
    // Filter by property if specified
    if (propertyId) {
        query.$or = [
            { propertyId: propertyId },
            { propertyId: null }, // System-wide announcements
        ];
    }
    // Filter by target audience
    query.$or = [{ targetAudience: "ALL" }, { targetAudience: "TENANTS_ONLY" }];
    const announcements = yield announcements_schema_1.Announcements.find(query)
        .populate({
        path: "propertyId",
        select: "name description address",
    })
        .sort({ priority: -1, createdAt: -1 });
    return announcements;
});
//* Get Announcement by ID
const getAnnouncementById = (announcementId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const announcement = yield announcements_schema_1.Announcements.findById(announcementId)
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
    yield announcements_schema_1.Announcements.findByIdAndDelete(announcementId);
    return {
        message: "Announcement deleted successfully",
    };
});
//* Mark Announcement as Read
const markAsRead = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, announcementId } = payload;
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    const announcement = yield announcements_schema_1.Announcements.findById(announcementId);
    if (!announcement) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Announcement not found");
    }
    // Check if user has already read this announcement
    const hasRead = announcement.readBy.some(id => id.toString() === userId);
    if (hasRead) {
        return {
            message: "Announcement already marked as read",
        };
    }
    yield announcements_schema_1.Announcements.findByIdAndUpdate(announcementId, {
        $addToSet: { readBy: userId },
    });
    return {
        message: "Announcement marked as read",
    };
});
//* Get Announcements by Property
const getAnnouncementsByProperty = (propertyId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view property announcements");
    }
    const announcements = yield announcements_schema_1.Announcements.find({
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
    const announcements = yield announcements_schema_1.Announcements.find({ type })
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
    const announcements = yield announcements_schema_1.Announcements.find({ priority })
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
//* Get Unread Announcements for User
const getUnreadAnnouncements = (userId, propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    const query = {
        isActive: true,
        publishDate: { $lte: new Date() },
        $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
        readBy: { $ne: userId },
    };
    // Filter by property if specified
    if (propertyId) {
        query.$or = [
            { propertyId: propertyId },
            { propertyId: null }, // System-wide announcements
        ];
    }
    // Filter by target audience
    query.$or = [{ targetAudience: "ALL" }, { targetAudience: "TENANTS_ONLY" }];
    const announcements = yield announcements_schema_1.Announcements.find(query)
        .populate({
        path: "propertyId",
        select: "name description address",
    })
        .sort({ priority: -1, createdAt: -1 });
    return announcements;
});
exports.AnnouncementService = {
    createAnnouncement,
    getAllAnnouncements,
    getActiveAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    markAsRead,
    getAnnouncementsByProperty,
    getAnnouncementsByType,
    getAnnouncementsByPriority,
    getUnreadAnnouncements,
};
