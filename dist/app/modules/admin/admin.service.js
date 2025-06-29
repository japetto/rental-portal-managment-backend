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
exports.AdminService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const mongoose_1 = __importDefault(require("mongoose"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const properties_schema_1 = require("../properties/properties.schema");
const service_requests_schema_1 = require("../service-requests/service-requests.schema");
const spots_schema_1 = require("../spots/spots.schema");
const users_schema_1 = require("../users/users.schema");
const inviteTenant = (inviteData) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate ObjectId format for propertyId
    if (!mongoose_1.default.Types.ObjectId.isValid(inviteData.propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    // Validate ObjectId format for spotId
    if (!mongoose_1.default.Types.ObjectId.isValid(inviteData.spotId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid spot ID format");
    }
    // Check if property exists
    const property = yield properties_schema_1.Properties.findById(inviteData.propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    // Check if spot exists and belongs to the property
    const spot = yield spots_schema_1.Spots.findOne({
        _id: inviteData.spotId,
        propertyId: inviteData.propertyId,
    });
    if (!spot) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Spot not found in this property");
    }
    // Check if spot is available
    if (spot.status !== "AVAILABLE") {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Spot is not available");
    }
    // Check if user already exists with this email
    const existingUser = yield users_schema_1.Users.findOne({ email: inviteData.email });
    if (existingUser) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "User with this email already exists");
    }
    // Check if user already exists with this phone number
    const existingUserByPhone = yield users_schema_1.Users.findOne({
        phoneNumber: inviteData.phoneNumber,
    });
    if (existingUserByPhone) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "User with this phone number already exists");
    }
    // Check if spot is already assigned to another user
    const existingSpotUser = yield users_schema_1.Users.findOne({ spotId: inviteData.spotId });
    if (existingSpotUser) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "Spot is already assigned to another tenant");
    }
    // Generate a temporary password (tenant will change it on first login)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    // Create the user with tenant role and invitation status
    const userData = {
        name: inviteData.name,
        email: inviteData.email,
        phoneNumber: inviteData.phoneNumber,
        password: tempPassword,
        confirmPassword: tempPassword,
        role: "TENANT",
        isInvited: true,
        isVerified: false,
        preferredLocation: inviteData.preferredLocation || property.address.city, // Use provided location or default to property city
        propertyId: inviteData.propertyId,
        spotId: inviteData.spotId,
    };
    const user = yield users_schema_1.Users.create(userData);
    // Update spot status to RESERVED
    yield spots_schema_1.Spots.findByIdAndUpdate(inviteData.spotId, { status: "RESERVED" });
    // Update property available lots count
    yield properties_schema_1.Properties.findByIdAndUpdate(inviteData.propertyId, {
        $inc: { availableLots: -1 },
    });
    return user;
});
const createProperty = (propertyData) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if property with same name already exists
    const existingProperty = yield properties_schema_1.Properties.findOne({
        name: propertyData.name,
    });
    if (existingProperty) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "Property with this name already exists");
    }
    // Create the property with available lots equal to total lots
    const property = yield properties_schema_1.Properties.create(Object.assign(Object.assign({}, propertyData), { availableLots: propertyData.totalLots }));
    return property;
});
const getAllProperties = () => __awaiter(void 0, void 0, void 0, function* () {
    const properties = yield properties_schema_1.Properties.find({}).sort({ createdAt: -1 });
    return properties;
});
const getPropertyById = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const property = yield properties_schema_1.Properties.findById(propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    return property;
});
const updateProperty = (propertyId, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const property = yield properties_schema_1.Properties.findById(propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    // If updating totalLots, recalculate availableLots
    if (updateData.totalLots !== undefined) {
        const occupiedLots = property.totalLots - property.availableLots;
        if (updateData.totalLots < occupiedLots) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot reduce total lots below occupied lots");
        }
        updateData.availableLots = updateData.totalLots - occupiedLots;
    }
    const updatedProperty = yield properties_schema_1.Properties.findByIdAndUpdate(propertyId, updateData, { new: true, runValidators: true });
    return updatedProperty;
});
const deleteProperty = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const property = yield properties_schema_1.Properties.findById(propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    // Check if property has any tenants
    const tenantsCount = yield users_schema_1.Users.countDocuments({ propertyId });
    if (tenantsCount > 0) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot delete property with existing tenants");
    }
    // Check if property has any spots
    const spotsCount = yield spots_schema_1.Spots.countDocuments({ propertyId });
    if (spotsCount > 0) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot delete property with existing spots");
    }
    yield properties_schema_1.Properties.findByIdAndDelete(propertyId);
});
const createSpot = (spotData) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate ObjectId format for propertyId
    if (!mongoose_1.default.Types.ObjectId.isValid(spotData.propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    // Check if property exists
    const property = yield properties_schema_1.Properties.findById(spotData.propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    // Check if property is active
    if (!property.isActive) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot create spots for inactive property");
    }
    // Check if spot number already exists in this property
    const existingSpot = yield spots_schema_1.Spots.findOne({
        propertyId: spotData.propertyId,
        spotNumber: spotData.spotNumber,
    });
    if (existingSpot) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "Spot number already exists in this property");
    }
    // Check if adding this spot would exceed property's total lots
    const currentSpotsCount = yield spots_schema_1.Spots.countDocuments({
        propertyId: spotData.propertyId,
    });
    if (currentSpotsCount >= property.totalLots) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot create more spots than the property's total lots capacity");
    }
    // Create the spot
    const spot = yield spots_schema_1.Spots.create(Object.assign(Object.assign({}, spotData), { status: "AVAILABLE", isActive: true }));
    // Update property's available lots count
    yield properties_schema_1.Properties.findByIdAndUpdate(spotData.propertyId, {
        $inc: { availableLots: 1 },
    });
    return spot;
});
const getSpotsByProperty = (propertyId, status) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    // Check if property exists
    const property = yield properties_schema_1.Properties.findById(propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    // Build query
    const query = { propertyId };
    // Add status filter if provided
    if (status) {
        const validStatuses = ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "RESERVED"];
        if (!validStatuses.includes(status.toUpperCase())) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid status. Must be one of: AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED");
        }
        query.status = status.toUpperCase();
    }
    const spots = yield spots_schema_1.Spots.find(query).sort({ spotNumber: 1 });
    return spots;
});
const getSpotById = (spotId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(spotId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid spot ID format");
    }
    const spot = yield spots_schema_1.Spots.findById(spotId);
    if (!spot) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Spot not found");
    }
    return spot;
});
const updateSpot = (spotId, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(spotId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid spot ID format");
    }
    const spot = yield spots_schema_1.Spots.findById(spotId);
    if (!spot) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Spot not found");
    }
    // If updating spot number, check for uniqueness within the property
    if (updateData.spotNumber && updateData.spotNumber !== spot.spotNumber) {
        const existingSpot = yield spots_schema_1.Spots.findOne({
            propertyId: spot.propertyId,
            spotNumber: updateData.spotNumber,
            _id: { $ne: spotId },
        });
        if (existingSpot) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, "Spot number already exists in this property");
        }
    }
    const updatedSpot = yield spots_schema_1.Spots.findByIdAndUpdate(spotId, updateData, {
        new: true,
        runValidators: true,
    });
    return updatedSpot;
});
const deleteSpot = (spotId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(spotId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid spot ID format");
    }
    const spot = yield spots_schema_1.Spots.findById(spotId);
    if (!spot) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Spot not found");
    }
    // Check if spot is occupied
    if (spot.status === "OCCUPIED") {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot delete an occupied spot");
    }
    // Check if spot is reserved
    if (spot.status === "RESERVED") {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot delete a reserved spot");
    }
    yield spots_schema_1.Spots.findByIdAndDelete(spotId);
    // Update property's available lots count
    yield properties_schema_1.Properties.findByIdAndUpdate(spot.propertyId, {
        $inc: { availableLots: -1 },
    });
});
const getAllTenants = () => __awaiter(void 0, void 0, void 0, function* () {
    const tenants = yield users_schema_1.Users.find({ role: "TENANT" })
        .populate("propertyId", "name address")
        .populate("spotId", "spotNumber status size price description")
        .sort({ createdAt: -1 });
    // Transform the data to include lot number more prominently
    const tenantsWithLotNumber = tenants.map(tenant => {
        const tenantData = tenant.toObject();
        // Add lot number as a direct field for easier access
        if (tenantData.spotId && typeof tenantData.spotId === "object") {
            tenantData.lotNumber = tenantData.spotId.spotNumber;
            tenantData.lotStatus = tenantData.spotId.status;
            tenantData.lotSize = tenantData.spotId.size;
            tenantData.lotPrice = tenantData.spotId.price;
            tenantData.lotDescription = tenantData.spotId.description;
        }
        return tenantData;
    });
    return tenantsWithLotNumber;
});
// Get all service requests with full details (Admin only)
const getAllServiceRequests = (filters, options) => __awaiter(void 0, void 0, void 0, function* () {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "requestedDate";
    const sortOrder = options.sortOrder === "asc" ? 1 : -1;
    // Build filter conditions
    const filterConditions = {};
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
    if (filters.propertyId) {
        filterConditions.propertyId = filters.propertyId;
    }
    if (filters.tenantId) {
        filterConditions.tenantId = filters.tenantId;
    }
    // Build sort conditions
    const sortConditions = {};
    sortConditions[sortBy] = sortOrder;
    const serviceRequests = yield service_requests_schema_1.ServiceRequests.find(filterConditions)
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation emergencyContact")
        .populate("propertyId", "name description address amenities totalLots availableLots isActive images rules")
        .populate("spotId", "spotNumber status size amenities hookups price description images isActive")
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
// Get service request by ID with full details (Admin only)
const getServiceRequestById = (requestId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(requestId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid service request ID format");
    }
    const serviceRequest = yield service_requests_schema_1.ServiceRequests.findById(requestId)
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation emergencyContact")
        .populate("propertyId", "name description address amenities totalLots availableLots isActive images rules")
        .populate("spotId", "spotNumber status size amenities hookups price description images isActive");
    if (!serviceRequest) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Service request not found");
    }
    return serviceRequest;
});
// Update service request status and details (Admin only)
const updateServiceRequest = (requestId, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(requestId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid service request ID format");
    }
    const serviceRequest = yield service_requests_schema_1.ServiceRequests.findById(requestId);
    if (!serviceRequest) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Service request not found");
    }
    // If status is being updated to COMPLETED, set completedDate if not provided
    if (updateData.status === "COMPLETED" && !updateData.completedDate) {
        updateData.completedDate = new Date();
    }
    const updatedRequest = yield service_requests_schema_1.ServiceRequests.findByIdAndUpdate(requestId, updateData, { new: true, runValidators: true })
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation emergencyContact")
        .populate("propertyId", "name description address amenities totalLots availableLots isActive images rules")
        .populate("spotId", "spotNumber status size amenities hookups price description images isActive");
    return updatedRequest;
});
// Add admin comment to service request
const addAdminComment = (requestId, comment) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(requestId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid service request ID format");
    }
    const serviceRequest = yield service_requests_schema_1.ServiceRequests.findById(requestId);
    if (!serviceRequest) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Service request not found");
    }
    // Append new comment to existing admin notes
    const timestamp = new Date().toISOString();
    const newComment = `[${timestamp}] ${comment}\n`;
    const updatedAdminNotes = serviceRequest.adminNotes
        ? serviceRequest.adminNotes + "\n" + newComment
        : newComment;
    const updatedRequest = yield service_requests_schema_1.ServiceRequests.findByIdAndUpdate(requestId, { adminNotes: updatedAdminNotes }, { new: true, runValidators: true })
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation emergencyContact")
        .populate("propertyId", "name description address amenities totalLots availableLots isActive images rules")
        .populate("spotId", "spotNumber status size amenities hookups price description images isActive");
    return updatedRequest;
});
// Get service requests by property (Admin only)
const getServiceRequestsByProperty = (propertyId, filters, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "requestedDate";
    const sortOrder = options.sortOrder === "asc" ? 1 : -1;
    // Build filter conditions
    const filterConditions = { propertyId };
    // Add additional filters
    if (filters.status) {
        filterConditions.status = filters.status;
    }
    if (filters.priority) {
        filterConditions.priority = filters.priority;
    }
    if (filters.type) {
        filterConditions.type = filters.type;
    }
    // Build sort conditions
    const sortConditions = {};
    sortConditions[sortBy] = sortOrder;
    const serviceRequests = yield service_requests_schema_1.ServiceRequests.find(filterConditions)
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation emergencyContact")
        .populate("propertyId", "name description address amenities totalLots availableLots isActive images rules")
        .populate("spotId", "spotNumber status size amenities hookups price description images isActive")
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
// Get service requests by tenant (Admin only)
const getServiceRequestsByTenant = (tenantId, filters, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid tenant ID format");
    }
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "requestedDate";
    const sortOrder = options.sortOrder === "asc" ? 1 : -1;
    // Build filter conditions
    const filterConditions = { tenantId };
    // Add additional filters
    if (filters.status) {
        filterConditions.status = filters.status;
    }
    if (filters.priority) {
        filterConditions.priority = filters.priority;
    }
    if (filters.type) {
        filterConditions.type = filters.type;
    }
    // Build sort conditions
    const sortConditions = {};
    sortConditions[sortBy] = sortOrder;
    const serviceRequests = yield service_requests_schema_1.ServiceRequests.find(filterConditions)
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation emergencyContact")
        .populate("propertyId", "name description address amenities totalLots availableLots isActive images rules")
        .populate("spotId", "spotNumber status size amenities hookups price description images isActive")
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
// Get urgent service requests (Admin only)
const getUrgentServiceRequests = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    const filterConditions = {
        priority: { $in: ["HIGH", "URGENT"] },
        status: { $ne: "COMPLETED" },
    };
    const serviceRequests = yield service_requests_schema_1.ServiceRequests.find(filterConditions)
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation emergencyContact")
        .populate("propertyId", "name description address amenities totalLots availableLots isActive images rules")
        .populate("spotId", "spotNumber status size amenities hookups price description images isActive")
        .sort({ priority: -1, requestedDate: -1 })
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
// Get service request dashboard statistics (Admin only)
const getServiceRequestDashboardStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const totalRequests = yield service_requests_schema_1.ServiceRequests.countDocuments();
    const pendingRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        status: "PENDING",
    });
    const inProgressRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        status: "IN_PROGRESS",
    });
    const completedRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        status: "COMPLETED",
    });
    const urgentRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        priority: { $in: ["HIGH", "URGENT"] },
        status: { $ne: "COMPLETED" },
    });
    // Get requests by type
    const typeStats = yield service_requests_schema_1.ServiceRequests.aggregate([
        {
            $group: {
                _id: "$type",
                count: { $sum: 1 },
                pending: {
                    $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
                },
                inProgress: {
                    $sum: { $cond: [{ $eq: ["$status", "IN_PROGRESS"] }, 1, 0] },
                },
                completed: {
                    $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
                },
            },
        },
    ]);
    // Get requests by property
    const propertyStats = yield service_requests_schema_1.ServiceRequests.aggregate([
        {
            $lookup: {
                from: "properties",
                localField: "propertyId",
                foreignField: "_id",
                as: "property",
            },
        },
        {
            $unwind: "$property",
        },
        {
            $group: {
                _id: "$propertyId",
                propertyName: { $first: "$property.name" },
                count: { $sum: 1 },
                pending: {
                    $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
                },
                urgent: {
                    $sum: { $cond: [{ $in: ["$priority", ["HIGH", "URGENT"]] }, 1, 0] },
                },
            },
        },
        {
            $sort: { count: -1 },
        },
    ]);
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = yield service_requests_schema_1.ServiceRequests.find({
        createdAt: { $gte: sevenDaysAgo },
    })
        .populate("tenantId", "name email")
        .populate("propertyId", "name")
        .populate("spotId", "spotNumber")
        .sort({ createdAt: -1 })
        .limit(10);
    return {
        overview: {
            total: totalRequests,
            pending: pendingRequests,
            inProgress: inProgressRequests,
            completed: completedRequests,
            urgent: urgentRequests,
        },
        byType: typeStats,
        byProperty: propertyStats,
        recentActivity,
    };
});
exports.AdminService = {
    inviteTenant,
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
    getAllTenants,
    getAllServiceRequests,
    getServiceRequestById,
    updateServiceRequest,
    addAdminComment,
    getServiceRequestsByProperty,
    getServiceRequestsByTenant,
    getUrgentServiceRequests,
    getServiceRequestDashboardStats,
};
