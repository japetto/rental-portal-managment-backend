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
const softDeleteUtils_1 = require("../../../shared/softDeleteUtils");
const properties_schema_1 = require("../properties/properties.schema");
const properties_service_1 = require("../properties/properties.service");
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
        throw new ApiError_1.default(http_status_1.default.CONFLICT, `Spot is already assigned to tenant: ${existingSpotUser.name}`);
    }
    // Create the user with tenant role and invitation status (no password - they'll set it via invitation link)
    const userData = {
        name: inviteData.name,
        email: inviteData.email,
        phoneNumber: inviteData.phoneNumber,
        password: "", // Empty password - tenant will set it via invitation link
        confirmPassword: "", // Empty confirmation password
        role: "TENANT",
        isInvited: true,
        isVerified: false,
        preferredLocation: inviteData.preferredLocation || property.address.city, // Use provided location or default to property city
        propertyId: inviteData.propertyId,
        spotId: inviteData.spotId,
    };
    const user = yield users_schema_1.Users.create(userData);
    // Update spot status to MAINTENANCE (temporarily unavailable)
    yield spots_schema_1.Spots.findByIdAndUpdate(inviteData.spotId, { status: "MAINTENANCE" });
    // Property lots are now calculated from spots, no need to update manually
    const propertyWithLotData = yield (0, properties_service_1.addLotDataToProperty)(property);
    return {
        user,
        property: propertyWithLotData,
        spot,
    };
});
const createProperty = (propertyData) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if property with same name already exists
    const existingProperty = yield properties_schema_1.Properties.findOne({
        name: propertyData.name,
    });
    if (existingProperty) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "Property with this name already exists");
    }
    // Create the property
    const property = yield properties_schema_1.Properties.create(propertyData);
    return property;
});
const getAllProperties = () => __awaiter(void 0, void 0, void 0, function* () {
    const properties = yield properties_schema_1.Properties.find({}).sort({ createdAt: -1 });
    const propertiesWithLotData = yield (0, properties_service_1.addLotDataToProperties)(properties);
    return propertiesWithLotData;
});
const getPropertyById = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const property = yield properties_schema_1.Properties.findById(propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    const propertyWithLotData = yield (0, properties_service_1.addLotDataToProperty)(property);
    return propertyWithLotData;
});
const updateProperty = (propertyId, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const property = yield properties_schema_1.Properties.findById(propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    // No need to handle totalLots/availableLots updates - they are calculated from spots
    const updatedProperty = yield properties_schema_1.Properties.findByIdAndUpdate(propertyId, updateData, { new: true, runValidators: true });
    const propertyWithLotData = yield (0, properties_service_1.addLotDataToProperty)(updatedProperty);
    return propertyWithLotData;
});
const deleteProperty = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const property = yield properties_schema_1.Properties.findById(propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    // Check if property has any active tenants
    const activeTenantsCount = yield users_schema_1.Users.countDocuments({
        propertyId,
        isDeleted: false,
    });
    if (activeTenantsCount > 0) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot delete property with existing active tenants");
    }
    // Check if property has any active spots
    const activeSpotsCount = yield spots_schema_1.Spots.countDocuments({
        propertyId,
        isDeleted: false,
    });
    if (activeSpotsCount > 0) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot delete property with existing active spots");
    }
    yield (0, softDeleteUtils_1.softDelete)(properties_schema_1.Properties, propertyId);
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
    // Property is always active now (no isActive field)
    // Check if spot number already exists in this property
    const existingSpotByNumber = yield spots_schema_1.Spots.findOne({
        propertyId: spotData.propertyId,
        spotNumber: spotData.spotNumber,
    });
    if (existingSpotByNumber) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "Spot number already exists in this property");
    }
    // Check if spot identifier already exists in this property
    const existingSpotByIdentifier = yield spots_schema_1.Spots.findOne({
        propertyId: spotData.propertyId,
        spotIdentifier: spotData.spotIdentifier,
    });
    if (existingSpotByIdentifier) {
        throw new ApiError_1.default(http_status_1.default.CONFLICT, "Spot identifier already exists in this property");
    }
    // Validate status - only AVAILABLE and MAINTENANCE are allowed
    if (spotData.status &&
        !["AVAILABLE", "MAINTENANCE"].includes(spotData.status)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid status. Only AVAILABLE and MAINTENANCE are allowed for spot creation");
    }
    // Validate that at least one price is provided
    if (!spotData.price.daily &&
        !spotData.price.weekly &&
        !spotData.price.monthly) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "At least one price (daily, weekly, or monthly) must be provided");
    }
    // No limit on spots - they are managed independently
    // Create the spot with validated data
    const spot = yield spots_schema_1.Spots.create(Object.assign(Object.assign({}, spotData), { status: spotData.status || "AVAILABLE", isActive: true }));
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
        const validStatuses = ["AVAILABLE", "MAINTENANCE"];
        if (!validStatuses.includes(status.toUpperCase())) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid status. Must be one of: AVAILABLE, MAINTENANCE");
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
        const existingSpotByNumber = yield spots_schema_1.Spots.findOne({
            propertyId: spot.propertyId,
            spotNumber: updateData.spotNumber,
            _id: { $ne: spotId },
        });
        if (existingSpotByNumber) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, "Spot number already exists in this property");
        }
    }
    // If updating spot identifier, check for uniqueness within the property
    if (updateData.spotIdentifier &&
        updateData.spotIdentifier !== spot.spotIdentifier) {
        const existingSpotByIdentifier = yield spots_schema_1.Spots.findOne({
            propertyId: spot.propertyId,
            spotIdentifier: updateData.spotIdentifier,
            _id: { $ne: spotId },
        });
        if (existingSpotByIdentifier) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, "Spot identifier already exists in this property");
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
    // Check if spot is assigned to an active tenant (reserved/booked)
    const assignedTenant = yield users_schema_1.Users.findOne({
        spotId,
        isDeleted: false,
    });
    if (assignedTenant) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `Cannot delete a spot that is assigned to tenant: ${assignedTenant.name}`);
    }
    yield (0, softDeleteUtils_1.softDelete)(spots_schema_1.Spots, spotId);
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
        priority: "URGENT",
        status: { $ne: "COMPLETED" },
    });
    return {
        total: totalRequests,
        pending: pendingRequests,
        inProgress: inProgressRequests,
        completed: completedRequests,
        urgent: urgentRequests,
    };
});
// Admin User Management Services
const getAllUsers = (adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view all users");
    }
    const users = yield users_schema_1.Users.find({})
        .select("-password")
        .sort({ createdAt: -1 });
    return users;
});
const getUserById = (userId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid user ID format");
    }
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view user details");
    }
    const user = yield users_schema_1.Users.findById(userId).select("-password");
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    return user;
});
const updateUser = (userId, updateData, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid user ID format");
    }
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can update user information");
    }
    // Prevent admin from updating themselves through this endpoint
    if (userId === adminId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Cannot update your own account through this endpoint");
    }
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // Check for phone number uniqueness if being updated
    if (updateData.phoneNumber && updateData.phoneNumber !== user.phoneNumber) {
        const existingUser = yield users_schema_1.Users.findOne({
            phoneNumber: updateData.phoneNumber,
        });
        if (existingUser) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, "Phone number already exists");
        }
    }
    const updatedUser = yield users_schema_1.Users.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
    }).select("-password");
    if (!updatedUser) {
        throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to update user");
    }
    return updatedUser;
});
const deleteUser = (userId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid user ID format");
    }
    // Prevent admin from deleting themselves
    if (userId === adminId) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Cannot delete your own account");
    }
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can delete users");
    }
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found");
    }
    // Check if user has active property or spot assignments
    if (user.propertyId || user.spotId) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot delete user with active property or spot assignments. Please remove assignments first.");
    }
    yield users_schema_1.Users.findByIdAndDelete(userId);
    return {
        message: "User deleted successfully",
    };
});
// Archive and Restore Methods
// Archive a property (soft delete)
const archiveProperty = (propertyId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can archive properties");
    }
    const property = yield properties_schema_1.Properties.findById(propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    // Check if property has any active tenants
    const activeTenantsCount = yield users_schema_1.Users.countDocuments({
        propertyId,
        isDeleted: false,
    });
    if (activeTenantsCount > 0) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot archive property with existing active tenants");
    }
    // Check if property has any active spots
    const activeSpotsCount = yield spots_schema_1.Spots.countDocuments({
        propertyId,
        isDeleted: false,
    });
    if (activeSpotsCount > 0) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot archive property with existing active spots");
    }
    yield (0, softDeleteUtils_1.softDelete)(properties_schema_1.Properties, propertyId, adminId);
    return {
        message: "Property archived successfully",
    };
});
// Restore a property
const restoreProperty = (propertyId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can restore properties");
    }
    const property = yield properties_schema_1.Properties.findById(propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    if (!property.isDeleted) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Property is not archived");
    }
    yield (0, softDeleteUtils_1.restoreRecord)(properties_schema_1.Properties, propertyId, adminId);
    return {
        message: "Property restored successfully",
    };
});
// Archive a spot (soft delete)
const archiveSpot = (spotId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(spotId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid spot ID format");
    }
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can archive spots");
    }
    const spot = yield spots_schema_1.Spots.findById(spotId);
    if (!spot) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Spot not found");
    }
    // Check if spot is assigned to an active tenant
    const assignedTenant = yield users_schema_1.Users.findOne({
        spotId,
        isDeleted: false,
    });
    if (assignedTenant) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `Cannot archive a spot that is assigned to tenant: ${assignedTenant.name}`);
    }
    yield (0, softDeleteUtils_1.softDelete)(spots_schema_1.Spots, spotId, adminId);
    // Update property's available lots count
    yield properties_schema_1.Properties.findByIdAndUpdate(spot.propertyId, {
        $inc: { availableLots: -1 },
    });
    return {
        message: "Spot archived successfully",
    };
});
// Restore a spot
const restoreSpot = (spotId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(spotId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid spot ID format");
    }
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can restore spots");
    }
    const spot = yield spots_schema_1.Spots.findById(spotId);
    if (!spot) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Spot not found");
    }
    if (!spot.isDeleted) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Spot is not archived");
    }
    yield (0, softDeleteUtils_1.restoreRecord)(spots_schema_1.Spots, spotId, adminId);
    // Update property's available lots count
    yield properties_schema_1.Properties.findByIdAndUpdate(spot.propertyId, {
        $inc: { availableLots: 1 },
    });
    return {
        message: "Spot restored successfully",
    };
});
// Get archived properties
const getArchivedProperties = (adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view archived properties");
    }
    const archivedProperties = yield (0, softDeleteUtils_1.getDeletedRecords)(properties_schema_1.Properties);
    const propertiesWithLotData = yield (0, properties_service_1.addLotDataToProperties)(archivedProperties);
    return propertiesWithLotData;
});
// Get archived spots
const getArchivedSpots = (adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can view archived spots");
    }
    return yield (0, softDeleteUtils_1.getDeletedRecords)(spots_schema_1.Spots);
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
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    archiveProperty,
    restoreProperty,
    archiveSpot,
    restoreSpot,
    getArchivedProperties,
    getArchivedSpots,
};
