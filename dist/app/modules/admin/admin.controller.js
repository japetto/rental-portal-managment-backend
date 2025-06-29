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
exports.AdminController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const config_1 = __importDefault(require("../../../config/config"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const admin_service_1 = require("./admin.service");
const inviteTenant = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const inviteData = req.body;
    const result = yield admin_service_1.AdminService.inviteTenant(inviteData);
    // Generate URL with tenant data for auto-filling client UI
    const baseUrl = config_1.default.client_url || "http://localhost:3000";
    const tenantData = {
        id: result._id,
        name: result.name,
        email: result.email,
        phone: result.phoneNumber,
        preferredLocation: result.preferredLocation,
        propertyId: result.propertyId,
        spotId: result.spotId,
    };
    // Encode the data as base64 to make it URL-safe
    const encodedData = Buffer.from(JSON.stringify(tenantData)).toString("base64");
    const autoFillUrl = `${baseUrl}/tenant-setup?data=${encodedData}`;
    // Example of how to decode this URL on the client side:
    //
    // // In your React component or JavaScript file:
    // const getTenantDataFromUrl = () => {
    //   const urlParams = new URLSearchParams(window.location.search);
    //   const encodedData = urlParams.get('data');
    //
    //   if (encodedData) {
    //     try {
    //       const tenantData = JSON.parse(atob(encodedData));
    //       return {
    //         id: tenantData.id,
    //         name: tenantData.name,
    //         email: tenantData.email,
    //         phone: tenantData.phone,
    //         preferredLocation: tenantData.preferredLocation,
    //         propertyId: tenantData.propertyId,
    //         spotId: tenantData.spotId,
    //       };
    //     } catch (error) {
    //       console.error('Error decoding tenant data:', error);
    //       return null;
    //     }
    //   }
    //   return null;
    // };
    //
    // // Usage in React component:
    // const tenantData = getTenantDataFromUrl();
    // if (tenantData) {
    //   // Auto-fill your form fields
    //   setFormData({
    //     name: tenantData.name,
    //     email: tenantData.email,
    //     phone: tenantData.phone,
    //     preferredLocation: tenantData.preferredLocation,
    //   });
    // }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Tenant invited successfully",
        data: {
            user: {
                _id: result._id,
                name: result.name,
                email: result.email,
                phoneNumber: result.phoneNumber,
                role: result.role,
                isInvited: result.isInvited,
                propertyId: result.propertyId,
                spotId: result.spotId,
                preferredLocation: result.preferredLocation,
            },
            autoFillUrl: autoFillUrl,
            message: "Invitation sent successfully. Tenant will receive login credentials.",
        },
    });
}));
const getAllTenants = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getAllTenants();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Tenants retrieved successfully",
        data: result,
    });
}));
const createProperty = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const propertyData = req.body;
    const result = yield admin_service_1.AdminService.createProperty(propertyData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Property created successfully",
        data: result,
    });
}));
const getAllProperties = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getAllProperties();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Properties retrieved successfully",
        data: result,
    });
}));
const getPropertyById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield admin_service_1.AdminService.getPropertyById(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Property retrieved successfully",
        data: result,
    });
}));
const updateProperty = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const updateData = req.body;
    const result = yield admin_service_1.AdminService.updateProperty(id, updateData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Property updated successfully",
        data: result,
    });
}));
const deleteProperty = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield admin_service_1.AdminService.deleteProperty(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Property deleted successfully",
        data: null,
    });
}));
const createSpot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const spotData = req.body;
    const result = yield admin_service_1.AdminService.createSpot(spotData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Spot created successfully",
        data: result,
    });
}));
const getSpotsByProperty = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { propertyId } = req.params;
    const { status } = req.query;
    const result = yield admin_service_1.AdminService.getSpotsByProperty(propertyId, status);
    const message = status
        ? `Spots with status '${status}' retrieved successfully`
        : "All spots retrieved successfully";
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message,
        data: result,
    });
}));
const getSpotById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield admin_service_1.AdminService.getSpotById(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Spot retrieved successfully",
        data: result,
    });
}));
const updateSpot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const updateData = req.body;
    const result = yield admin_service_1.AdminService.updateSpot(id, updateData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Spot updated successfully",
        data: result,
    });
}));
const deleteSpot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield admin_service_1.AdminService.deleteSpot(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Spot deleted successfully",
        data: null,
    });
}));
// Get all service requests with full details (Admin only)
const getAllServiceRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filters = req.query;
    const options = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        sortBy: req.query.sortBy || "requestedDate",
        sortOrder: req.query.sortOrder || "desc",
    };
    const result = yield admin_service_1.AdminService.getAllServiceRequests(filters, options);
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
// Get service request by ID with full details (Admin only)
const getServiceRequestById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!id) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Service request ID is required",
            data: null,
        });
    }
    const result = yield admin_service_1.AdminService.getServiceRequestById(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Service request retrieved successfully",
        data: result,
    });
}));
// Update service request status and details (Admin only)
const updateServiceRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Service request ID is required",
            data: null,
        });
    }
    const result = yield admin_service_1.AdminService.updateServiceRequest(id, updateData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Service request updated successfully",
        data: result,
    });
}));
// Add admin comment to service request
const addAdminComment = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { comment } = req.body;
    if (!id) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Service request ID is required",
            data: null,
        });
    }
    if (!comment) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Comment is required",
            data: null,
        });
    }
    const result = yield admin_service_1.AdminService.addAdminComment(id, comment);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Comment added successfully",
        data: result,
    });
}));
// Get service requests by property (Admin only)
const getServiceRequestsByProperty = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { propertyId } = req.params;
    const filters = req.query;
    const options = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        sortBy: req.query.sortBy || "requestedDate",
        sortOrder: req.query.sortOrder || "desc",
    };
    if (!propertyId) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Property ID is required",
            data: null,
        });
    }
    const result = yield admin_service_1.AdminService.getServiceRequestsByProperty(propertyId, filters, options);
    const responseData = {
        serviceRequests: result.data,
        pagination: result.meta,
    };
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Service requests by property retrieved successfully",
        data: responseData,
    });
}));
// Get service requests by tenant (Admin only)
const getServiceRequestsByTenant = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.params;
    const filters = req.query;
    const options = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        sortBy: req.query.sortBy || "requestedDate",
        sortOrder: req.query.sortOrder || "desc",
    };
    if (!tenantId) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Tenant ID is required",
            data: null,
        });
    }
    const result = yield admin_service_1.AdminService.getServiceRequestsByTenant(tenantId, filters, options);
    const responseData = {
        serviceRequests: result.data,
        pagination: result.meta,
    };
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Service requests by tenant retrieved successfully",
        data: responseData,
    });
}));
// Get urgent service requests (Admin only)
const getUrgentServiceRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
    };
    const result = yield admin_service_1.AdminService.getUrgentServiceRequests(options);
    const responseData = {
        serviceRequests: result.data,
        pagination: result.meta,
    };
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Urgent service requests retrieved successfully",
        data: responseData,
    });
}));
// Get service request dashboard statistics (Admin only)
const getServiceRequestDashboardStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getServiceRequestDashboardStats();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Service request dashboard stats retrieved successfully",
        data: result,
    });
}));
// Admin User Management Controllers
const getAllUsers = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield admin_service_1.AdminService.getAllUsers(adminId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Users retrieved successfully",
        data: result,
    });
}));
const getUserById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { userId } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield admin_service_1.AdminService.getUserById(userId, adminId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User retrieved successfully",
        data: result,
    });
}));
const updateUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { userId } = req.params;
    const updateData = req.body;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield admin_service_1.AdminService.updateUser(userId, updateData, adminId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User updated successfully",
        data: result,
    });
}));
const deleteUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { userId } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield admin_service_1.AdminService.deleteUser(userId, adminId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User deleted successfully",
        data: result,
    });
}));
exports.AdminController = {
    inviteTenant,
    getAllTenants,
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
    createSpot,
    getSpotsByProperty,
    getSpotById,
    updateSpot,
    deleteSpot,
    getAllServiceRequests,
    getServiceRequestById,
    updateServiceRequest,
    addAdminComment,
    getServiceRequestsByProperty,
    getServiceRequestsByTenant,
    getUrgentServiceRequests,
    getServiceRequestDashboardStats,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
};
