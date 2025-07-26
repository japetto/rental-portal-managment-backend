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
exports.ServiceRequestService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const mongoose_1 = __importDefault(require("mongoose"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const softDeleteUtils_1 = require("../../../shared/softDeleteUtils");
const properties_schema_1 = require("../properties/properties.schema");
const spots_schema_1 = require("../spots/spots.schema");
const users_schema_1 = require("../users/users.schema");
const service_requests_schema_1 = require("./service-requests.schema");
// Create service request
const createServiceRequest = (payload, userId) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate ObjectId format
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid user ID format");
    }
    // Get user details to verify they're a tenant and get their property/spot info
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    if (user.role !== "TENANT") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only tenants can create service requests");
    }
    if (!user.propertyId || !user.spotId) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "User must be assigned to a property and spot to create service requests");
    }
    // Verify property and spot exist
    const property = yield properties_schema_1.Properties.findById(user.propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    const spot = yield spots_schema_1.Spots.findById(user.spotId);
    if (!spot) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Spot not found");
    }
    // Create service request with user's property and spot info
    const serviceRequestData = Object.assign(Object.assign({}, payload), { tenantId: userId, propertyId: user.propertyId, spotId: user.spotId });
    const serviceRequest = yield service_requests_schema_1.ServiceRequests.create(serviceRequestData);
    // Populate references for response
    const populatedRequest = yield service_requests_schema_1.ServiceRequests.findById(serviceRequest._id)
        .populate("tenantId", "name email phoneNumber")
        .populate("propertyId", "name address")
        .populate("spotId", "spotNumber status");
    return populatedRequest;
});
// Get service request by ID
const getServiceRequestById = (requestId, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(requestId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid service request ID format");
    }
    const serviceRequest = yield service_requests_schema_1.ServiceRequests.findOne({
        _id: requestId,
        isDeleted: false,
    })
        .populate("tenantId", "name email phoneNumber")
        .populate("propertyId", "name address")
        .populate("spotId", "spotNumber status");
    if (!serviceRequest) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Service request not found");
    }
    // Check access permissions
    if (userRole !== "SUPER_ADMIN" &&
        serviceRequest.tenantId.toString() !== userId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Access denied");
    }
    return serviceRequest;
});
// Get service requests with filters and pagination
const getServiceRequests = (filters, options, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "requestedDate";
    const sortOrder = options.sortOrder === "asc" ? 1 : -1;
    // Build filter conditions
    const filterConditions = {
        isDeleted: false, // Only get non-deleted records
    };
    // Add filters
    if (filters.status) {
        filterConditions.status = filters.status;
    }
    if (filters.priority) {
        filterConditions.priority = filters.priority;
    }
    if (filters.type) {
        filterConditions.type = filters.type;
    }
    // Role-based filtering
    if (userRole !== "SUPER_ADMIN") {
        // Tenants can only see their own requests
        filterConditions.tenantId = userId;
    }
    // Build sort conditions
    const sortConditions = {};
    sortConditions[sortBy] = sortOrder;
    const serviceRequests = yield service_requests_schema_1.ServiceRequests.find(filterConditions)
        .populate("tenantId", "name email phoneNumber")
        .populate("propertyId", "name address")
        .populate("spotId", "spotNumber status")
        .sort(sortConditions)
        .skip(skip)
        .limit(limit);
    const total = yield service_requests_schema_1.ServiceRequests.countDocuments(filterConditions);
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: serviceRequests,
    };
});
// Update service request (tenant can only update certain fields)
const updateServiceRequest = (requestId, payload, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(requestId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid service request ID format");
    }
    const serviceRequest = yield service_requests_schema_1.ServiceRequests.findOne({
        _id: requestId,
        isDeleted: false,
    });
    if (!serviceRequest) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Service request not found");
    }
    // Check access permissions
    if (userRole !== "SUPER_ADMIN" &&
        serviceRequest.tenantId.toString() !== userId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Access denied");
    }
    // Tenants can only update certain fields and only if status is PENDING
    if (userRole !== "SUPER_ADMIN") {
        if (serviceRequest.status !== "PENDING") {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot update service request that is not in PENDING status");
        }
        // Remove admin-only fields from payload
        const { status, completedDate, assignedTo, estimatedCost, actualCost, adminNotes } = payload, tenantAllowedFields = __rest(payload, ["status", "completedDate", "assignedTo", "estimatedCost", "actualCost", "adminNotes"]);
        const updatedRequest = yield service_requests_schema_1.ServiceRequests.findByIdAndUpdate(requestId, tenantAllowedFields, { new: true, runValidators: true })
            .populate("tenantId", "name email phoneNumber")
            .populate("propertyId", "name address")
            .populate("spotId", "spotNumber status");
        return updatedRequest;
    }
    // Admin can update all fields
    const updatedRequest = yield service_requests_schema_1.ServiceRequests.findByIdAndUpdate(requestId, payload, { new: true, runValidators: true })
        .populate("tenantId", "name email phoneNumber")
        .populate("propertyId", "name address")
        .populate("spotId", "spotNumber status");
    return updatedRequest;
});
// Delete service request
const deleteServiceRequest = (requestId, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(requestId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid service request ID format");
    }
    const serviceRequest = yield service_requests_schema_1.ServiceRequests.findOne({
        _id: requestId,
        isDeleted: false,
    });
    if (!serviceRequest) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Service request not found");
    }
    // Check access permissions
    if (userRole !== "SUPER_ADMIN" &&
        serviceRequest.tenantId.toString() !== userId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Access denied");
    }
    // Only allow deletion if status is PENDING
    if (serviceRequest.status !== "PENDING") {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot delete service request that is not in PENDING status");
    }
    yield (0, softDeleteUtils_1.softDelete)(service_requests_schema_1.ServiceRequests, requestId);
    return {
        message: "Service request deleted successfully",
    };
});
// Get service request statistics (admin only)
const getServiceRequestStats = (userRole) => __awaiter(void 0, void 0, void 0, function* () {
    if (userRole !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only admins can view statistics");
    }
    const stats = yield service_requests_schema_1.ServiceRequests.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);
    const priorityStats = yield service_requests_schema_1.ServiceRequests.aggregate([
        {
            $group: {
                _id: "$priority",
                count: { $sum: 1 },
            },
        },
    ]);
    const typeStats = yield service_requests_schema_1.ServiceRequests.aggregate([
        {
            $group: {
                _id: "$type",
                count: { $sum: 1 },
            },
        },
    ]);
    const totalRequests = yield service_requests_schema_1.ServiceRequests.countDocuments();
    const pendingRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        status: "PENDING",
    });
    const urgentRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        priority: "URGENT",
        status: { $ne: "COMPLETED" },
    });
    return {
        total: totalRequests,
        pending: pendingRequests,
        urgent: urgentRequests,
        byStatus: stats,
        byPriority: priorityStats,
        byType: typeStats,
    };
});
// Archive a service request (soft delete)
const archiveServiceRequest = (requestId, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(requestId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid service request ID format");
    }
    const serviceRequest = yield service_requests_schema_1.ServiceRequests.findOne({
        _id: requestId,
        isDeleted: false,
    });
    if (!serviceRequest) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Service request not found");
    }
    // Check access permissions
    if (userRole !== "SUPER_ADMIN" &&
        serviceRequest.tenantId.toString() !== userId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Access denied");
    }
    // Only allow archiving if status is PENDING or COMPLETED
    if (serviceRequest.status === "IN_PROGRESS") {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot archive service request that is in progress");
    }
    yield (0, softDeleteUtils_1.softDelete)(service_requests_schema_1.ServiceRequests, requestId, userId);
    return {
        message: "Service request archived successfully",
    };
});
// Restore a service request
const restoreServiceRequest = (requestId, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(requestId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid service request ID format");
    }
    const serviceRequest = yield service_requests_schema_1.ServiceRequests.findOne({
        _id: requestId,
        isDeleted: true,
    });
    if (!serviceRequest) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Service request not found or not archived");
    }
    // Check access permissions
    if (userRole !== "SUPER_ADMIN" &&
        serviceRequest.tenantId.toString() !== userId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Access denied");
    }
    yield (0, softDeleteUtils_1.restoreRecord)(service_requests_schema_1.ServiceRequests, requestId, userId);
    return {
        message: "Service request restored successfully",
    };
});
// Get archived service requests
const getArchivedServiceRequests = (userId_1, userRole_1, ...args_1) => __awaiter(void 0, [userId_1, userRole_1, ...args_1], void 0, function* (userId, userRole, filters = {}, options = {}) {
    if (userRole !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only admins can view archived service requests");
    }
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "deletedAt";
    const sortOrder = options.sortOrder === "asc" ? 1 : -1;
    // Build filter conditions for deleted records
    const filterConditions = Object.assign({ isDeleted: true }, filters);
    // Build sort conditions
    const sortConditions = {};
    sortConditions[sortBy] = sortOrder;
    const serviceRequests = yield service_requests_schema_1.ServiceRequests.find(filterConditions)
        .populate("tenantId", "name email phoneNumber")
        .populate("propertyId", "name address")
        .populate("spotId", "spotNumber status")
        .sort(sortConditions)
        .skip(skip)
        .limit(limit);
    const total = yield service_requests_schema_1.ServiceRequests.countDocuments(filterConditions);
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: serviceRequests,
    };
});
exports.ServiceRequestService = {
    createServiceRequest,
    getServiceRequestById,
    getServiceRequests,
    updateServiceRequest,
    deleteServiceRequest,
    getServiceRequestStats,
    archiveServiceRequest,
    restoreServiceRequest,
    getArchivedServiceRequests,
};
