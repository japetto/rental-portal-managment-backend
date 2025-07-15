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
const emailService_1 = require("../../../shared/emailService");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const admin_service_1 = require("./admin.service");
const inviteTenant = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const inviteData = req.body;
    const result = yield admin_service_1.AdminService.inviteTenant(inviteData);
    // Generate URL with tenant data for auto-filling client UI
    const baseUrl = config_1.default.client_url || "http://localhost:3000";
    const tenantData = {
        id: result.user._id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phoneNumber,
        preferredLocation: result.user.preferredLocation,
        propertyId: result.user.propertyId,
        spotId: result.user.spotId,
        // Add property details
        property: {
            id: result.property._id,
            name: result.property.name,
            address: result.property.address,
        },
        // Add spot details
        spot: {
            id: result.spot._id,
            spotNumber: result.spot.spotNumber,
            description: result.spot.description,
        },
    };
    // Encode the data as base64 to make it URL-safe
    const encodedData = Buffer.from(JSON.stringify(tenantData)).toString("base64");
    const autoFillUrl = `${baseUrl}/auth/tenant-setup?data=${encodedData}`;
    // Send invitation email to the tenant
    try {
        yield (0, emailService_1.sendTenantInvitationEmail)(result.user.email, result.user.name, autoFillUrl, result.property.name, result.spot.spotNumber);
    }
    catch (error) {
        console.error("Failed to send invitation email:", error);
        // Continue with the response even if email fails
    }
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
    //         // User details
    //         id: tenantData.id,
    //         name: tenantData.name,
    //         email: tenantData.email,
    //         phone: tenantData.phone,
    //         preferredLocation: tenantData.preferredLocation,
    //         propertyId: tenantData.propertyId,
    //         spotId: tenantData.spotId,
    //         // Property details
    //         property: tenantData.property,
    //         // Spot details
    //         spot: tenantData.spot,
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
    //
    //   // Display property and spot information
    //   setPropertyInfo(tenantData.property);
    //   setSpotInfo(tenantData.spot);
    // }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Tenant invited successfully",
        data: {
            user: {
                id: result.user._id,
                name: result.user.name,
                email: result.user.email,
                phone: result.user.phoneNumber,
                preferredLocation: result.user.preferredLocation,
                propertyId: result.user.propertyId,
                spotId: result.user.spotId,
            },
            property: {
                id: result.property._id,
                name: result.property.name,
                address: result.property.address,
            },
            spot: {
                id: result.spot._id,
                spotNumber: result.spot.spotNumber,
                description: result.spot.description,
            },
            autoFillUrl: autoFillUrl,
            message: "Invitation sent successfully. Tenant will receive login credentials via email.",
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
// Test email endpoint for debugging
const testEmail = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.query;
        if (!email || typeof email !== "string") {
            return (0, sendResponse_1.default)(res, {
                statusCode: 400,
                success: false,
                message: "Email parameter is required",
                data: null,
            });
        }
        // Test email connection
        const isConnected = yield (0, emailService_1.verifyEmailConnection)();
        if (!isConnected) {
            return (0, sendResponse_1.default)(res, {
                statusCode: 500,
                success: false,
                message: "Email service is not properly configured",
                data: null,
            });
        }
        // Send test email
        const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Service Test</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 0 0 5px 5px;
          }
          .success {
            color: #4CAF50;
            font-weight: bold;
          }
          .info {
            background-color: #e3f2fd;
            padding: 15px;
            border-left: 4px solid #2196F3;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Email Service Test Successful!</h1>
        </div>
        
        <div class="content">
          <p>Hello!</p>
          
          <p class="success">This is a test email to verify that your Mailjet email service is working correctly.</p>
          
          <div class="info">
            <strong>Test Details:</strong><br>
            • Email sent at: ${new Date().toLocaleString()}<br>
            • Service: Mailjet<br>
            • Status: Working correctly
          </div>
          
          <p>If you received this email, it means:</p>
          <ul>
            <li>Your Mailjet API keys are configured correctly</li>
            <li>Your sender email is verified</li>
            <li>The email service is ready for production use</li>
          </ul>
          
          <p>You can now use the email service to send invitation emails and other notifications.</p>
          
          <p>Best regards,<br>
          Rental Portal Management System</p>
        </div>
      </body>
      </html>
    `;
        yield (0, emailService_1.sendEmail)({
            to: email,
            subject: "🎉 Email Service Test - Rental Portal Management",
            html: testHtml,
        });
        return (0, sendResponse_1.default)(res, {
            statusCode: 200,
            success: true,
            message: "Test email sent successfully",
            data: {
                connected: true,
                email_sent_to: email,
                mailjet_api_key: process.env.MAILJET_API_KEY
                    ? "Configured"
                    : "Not configured",
                mailjet_api_secret: process.env.MAILJET_SECRET_KEY
                    ? "Configured"
                    : "Not configured",
                mailjet_sender_email: process.env.MAILJET_SENDER_EMAIL
                    ? "Configured"
                    : "Not configured",
            },
        });
    }
    catch (error) {
        return (0, sendResponse_1.default)(res, {
            statusCode: 500,
            success: false,
            message: "Email test failed",
            data: {
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
}));
// Archive and Restore Controllers
const archiveProperty = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield admin_service_1.AdminService.archiveProperty(id, adminId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Property archived successfully",
        data: result,
    });
}));
const restoreProperty = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield admin_service_1.AdminService.restoreProperty(id, adminId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Property restored successfully",
        data: result,
    });
}));
const archiveSpot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield admin_service_1.AdminService.archiveSpot(id, adminId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Spot archived successfully",
        data: result,
    });
}));
const restoreSpot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield admin_service_1.AdminService.restoreSpot(id, adminId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Spot restored successfully",
        data: result,
    });
}));
const getArchivedProperties = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield admin_service_1.AdminService.getArchivedProperties(adminId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Archived properties retrieved successfully",
        data: result,
    });
}));
const getArchivedSpots = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const adminId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!adminId) {
        throw new Error("Admin ID not found");
    }
    const result = yield admin_service_1.AdminService.getArchivedSpots(adminId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Archived spots retrieved successfully",
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
    testEmail,
    archiveProperty,
    restoreProperty,
    archiveSpot,
    restoreSpot,
    getArchivedProperties,
    getArchivedSpots,
};
