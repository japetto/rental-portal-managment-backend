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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const announcements_service_1 = require("./announcements.service");
// Create Announcement (Admin only)
const createAnnouncement = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const announcementData = __rest(req.body, []);
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield announcements_service_1.AnnouncementService.createAnnouncement(announcementData, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.CREATED,
        message: "Announcement created successfully",
        data: result,
    });
}));
// Get All Announcements (Admin only)
const getAllAnnouncements = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield announcements_service_1.AnnouncementService.getAllAnnouncements(adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Announcements retrieved successfully",
        data: result,
    });
}));
// Get Active Announcements (Public - for tenants)
const getActiveAnnouncements = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { propertyId } = req.query;
    const userId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    const result = yield announcements_service_1.AnnouncementService.getActiveAnnouncements(userId, propertyId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Active announcements retrieved successfully",
        data: result,
    });
}));
// Get Announcement by ID
const getAnnouncementById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { announcementId } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    const result = yield announcements_service_1.AnnouncementService.getAnnouncementById(announcementId, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Announcement retrieved successfully",
        data: result,
    });
}));
// Update Announcement (Admin only)
const updateAnnouncement = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { announcementId } = req.params;
    const updateData = __rest(req.body, []);
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield announcements_service_1.AnnouncementService.updateAnnouncement(announcementId, updateData, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Announcement updated successfully",
        data: result,
    });
}));
// Delete Announcement (Admin only)
const deleteAnnouncement = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { announcementId } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield announcements_service_1.AnnouncementService.deleteAnnouncement(announcementId, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Announcement deleted successfully",
        data: result,
    });
}));
// Mark Announcement as Read
const markAsRead = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const markAsReadData = __rest(req.body, []);
    const result = yield announcements_service_1.AnnouncementService.markAsRead(markAsReadData);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Announcement marked as read",
        data: result,
    });
}));
// Get Announcements by Property (Admin only)
const getAnnouncementsByProperty = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { propertyId } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield announcements_service_1.AnnouncementService.getAnnouncementsByProperty(propertyId, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Property announcements retrieved successfully",
        data: result,
    });
}));
// Get Announcements by Type (Admin only)
const getAnnouncementsByType = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { type } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield announcements_service_1.AnnouncementService.getAnnouncementsByType(type, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Announcements by type retrieved successfully",
        data: result,
    });
}));
// Get Announcements by Priority (Admin only)
const getAnnouncementsByPriority = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { priority } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield announcements_service_1.AnnouncementService.getAnnouncementsByPriority(priority, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Announcements by priority retrieved successfully",
        data: result,
    });
}));
// Get Unread Announcements for User
const getUnreadAnnouncements = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { propertyId } = req.query;
    const result = yield announcements_service_1.AnnouncementService.getUnreadAnnouncements(userId, propertyId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Unread announcements retrieved successfully",
        data: result,
    });
}));
exports.AnnouncementController = {
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
