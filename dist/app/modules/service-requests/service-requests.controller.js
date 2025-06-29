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
exports.ServiceRequestController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const service_requests_service_1 = require("./service-requests.service");
// Create service request
const createServiceRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const payload = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.UNAUTHORIZED,
            success: false,
            message: "User not authenticated",
            data: null,
        });
    }
    const result = yield service_requests_service_1.ServiceRequestService.createServiceRequest(payload, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Service request created successfully",
        data: result,
    });
}));
// Get service request by ID
const getServiceRequestById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!userId || !id) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.UNAUTHORIZED,
            success: false,
            message: "User not authenticated or invalid request ID",
            data: null,
        });
    }
    const result = yield service_requests_service_1.ServiceRequestService.getServiceRequestById(id, userId, userRole || "");
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Service request retrieved successfully",
        data: result,
    });
}));
// Get service requests with filters and pagination
const getServiceRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const filters = req.query;
    const options = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        sortBy: req.query.sortBy || "requestedDate",
        sortOrder: req.query.sortOrder || "desc",
    };
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!userId) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.UNAUTHORIZED,
            success: false,
            message: "User not authenticated",
            data: null,
        });
    }
    const result = yield service_requests_service_1.ServiceRequestService.getServiceRequests(filters, options, userId, userRole || "");
    // Send response with data and include meta in the data object
    const responseData = {
        serviceRequests: result.data,
        pagination: result.meta,
    };
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Service requests retrieved successfully",
        data: responseData,
    });
}));
// Update service request
const updateServiceRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const payload = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!userId || !id) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.UNAUTHORIZED,
            success: false,
            message: "User not authenticated or invalid request ID",
            data: null,
        });
    }
    const result = yield service_requests_service_1.ServiceRequestService.updateServiceRequest(id, payload, userId, userRole || "");
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Service request updated successfully",
        data: result,
    });
}));
// Delete service request
const deleteServiceRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!userId || !id) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.UNAUTHORIZED,
            success: false,
            message: "User not authenticated or invalid request ID",
            data: null,
        });
    }
    const result = yield service_requests_service_1.ServiceRequestService.deleteServiceRequest(id, userId, userRole || "");
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: result.message,
        data: null,
    });
}));
// Get service request statistics (admin only)
const getServiceRequestStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
    if (!userRole) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.UNAUTHORIZED,
            success: false,
            message: "User not authenticated",
            data: null,
        });
    }
    const result = yield service_requests_service_1.ServiceRequestService.getServiceRequestStats(userRole);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Service request statistics retrieved successfully",
        data: result,
    });
}));
exports.ServiceRequestController = {
    createServiceRequest,
    getServiceRequestById,
    getServiceRequests,
    updateServiceRequest,
    deleteServiceRequest,
    getServiceRequestStats,
};
