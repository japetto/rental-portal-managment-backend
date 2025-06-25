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
const getSpotsByProperty = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    // Check if property exists
    const property = yield properties_schema_1.Properties.findById(propertyId);
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    const spots = yield spots_schema_1.Spots.find({ propertyId }).sort({ spotNumber: 1 });
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
};
