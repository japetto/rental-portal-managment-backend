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
exports.AdminService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const mongoose_1 = __importDefault(require("mongoose"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const softDeleteUtils_1 = require("../../../shared/softDeleteUtils");
const payments_schema_1 = require("../payments/payments.schema");
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
        if (existingUser.isDeleted) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, `A tenant with email "${inviteData.email}" was previously deleted. Please restore the existing account or use a different email address.`);
        }
        if (!existingUser.isActive) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, `A tenant with email "${inviteData.email}" exists but is currently deactivated. Please reactivate the existing account or use a different email address.`);
        }
        throw new ApiError_1.default(http_status_1.default.CONFLICT, `A tenant with email "${inviteData.email}" already exists in the system. Please use a different email address or contact the existing tenant.`);
    }
    // Check if user already exists with this phone number
    const existingUserByPhone = yield users_schema_1.Users.findOne({
        phoneNumber: inviteData.phoneNumber,
    });
    if (existingUserByPhone) {
        if (existingUserByPhone.isDeleted) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, `A tenant with phone number "${inviteData.phoneNumber}" was previously deleted. Please restore the existing account or use a different phone number.`);
        }
        if (!existingUserByPhone.isActive) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, `A tenant with phone number "${inviteData.phoneNumber}" exists but is currently deactivated. Please reactivate the existing account or use a different phone number.`);
        }
        throw new ApiError_1.default(http_status_1.default.CONFLICT, `A tenant with phone number "${inviteData.phoneNumber}" already exists in the system. Please use a different phone number or contact the existing tenant.`);
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
    var _a, _b;
    try {
        // Check if property with same name already exists (including soft-deleted ones)
        const existingPropertyByName = yield properties_schema_1.Properties.findOne({
            name: propertyData.name,
        });
        if (existingPropertyByName) {
            if (existingPropertyByName.isDeleted) {
                throw new ApiError_1.default(http_status_1.default.CONFLICT, `A property with the name "${propertyData.name}" was previously deleted. Please use a different name or restore the existing property.`);
            }
            else {
                throw new ApiError_1.default(http_status_1.default.CONFLICT, `A property with the name "${propertyData.name}" already exists. Please choose a different name.`);
            }
        }
        // Create the property
        const property = yield properties_schema_1.Properties.create(propertyData);
        // Auto-assign default Stripe account to the new property
        try {
            const { autoAssignPropertyToDefaultAccount } = yield Promise.resolve().then(() => __importStar(require("../stripe/stripe.service")));
            yield autoAssignPropertyToDefaultAccount(property._id.toString());
        }
        catch (stripeError) {
            // Log the error but don't fail the property creation
            console.error("Failed to auto-assign default Stripe account:", stripeError);
            // You might want to add this to a queue for retry later
        }
        return property;
    }
    catch (error) {
        // Handle MongoDB duplicate key errors specifically
        if (error.code === 11000) {
            if ((_a = error.keyPattern) === null || _a === void 0 ? void 0 : _a.propertyName) {
                throw new ApiError_1.default(http_status_1.default.CONFLICT, "A property with this name already exists. Please choose a different name.");
            }
            else if ((_b = error.keyPattern) === null || _b === void 0 ? void 0 : _b.name) {
                throw new ApiError_1.default(http_status_1.default.CONFLICT, `A property with the name "${propertyData.name}" already exists. Please choose a different name.`);
            }
        }
        throw error;
    }
});
const getAllProperties = () => __awaiter(void 0, void 0, void 0, function* () {
    const properties = yield properties_schema_1.Properties.find({ isDeleted: false }).sort({
        createdAt: -1,
    });
    const propertiesWithLotData = yield (0, properties_service_1.addLotDataToProperties)(properties);
    return propertiesWithLotData;
});
const getPropertyById = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const property = yield properties_schema_1.Properties.findOne({
        _id: propertyId,
        isDeleted: false,
    });
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    const propertyWithLotData = yield (0, properties_service_1.addLotDataToProperty)(property);
    return propertyWithLotData;
});
const updateProperty = (propertyId, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
        }
        const property = yield properties_schema_1.Properties.findOne({
            _id: propertyId,
            isDeleted: false,
        });
        if (!property) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
        }
        // Check if the new name conflicts with existing properties
        if (updateData.name) {
            const existingProperty = yield properties_schema_1.Properties.findOne({
                name: updateData.name,
                _id: { $ne: propertyId }, // Exclude current property
            });
            if (existingProperty) {
                if (existingProperty.isDeleted) {
                    throw new ApiError_1.default(http_status_1.default.CONFLICT, `A property with the name "${updateData.name}" was previously deleted. Please use a different name or restore the existing property.`);
                }
                else {
                    throw new ApiError_1.default(http_status_1.default.CONFLICT, `A property with the name "${updateData.name}" already exists. Please choose a different name.`);
                }
            }
        }
        const updatedProperty = yield properties_schema_1.Properties.findByIdAndUpdate(propertyId, updateData, { new: true, runValidators: true });
        const propertyWithLotData = yield (0, properties_service_1.addLotDataToProperty)(updatedProperty);
        return propertyWithLotData;
    }
    catch (error) {
        // Handle MongoDB duplicate key errors specifically
        if (error.code === 11000) {
            if ((_a = error.keyPattern) === null || _a === void 0 ? void 0 : _a.propertyName) {
                throw new ApiError_1.default(http_status_1.default.CONFLICT, "A property with this name already exists. Please choose a different name.");
            }
            else if ((_b = error.keyPattern) === null || _b === void 0 ? void 0 : _b.name) {
                throw new ApiError_1.default(http_status_1.default.CONFLICT, `A property with the name "${updateData.name}" already exists. Please choose a different name.`);
            }
        }
        throw error;
    }
});
const deleteProperty = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid property ID format");
    }
    const property = yield properties_schema_1.Properties.findOne({
        _id: propertyId,
        isDeleted: false,
    });
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
    // Check if lot identifier already exists in this property
    const existingSpotByIdentifier = yield spots_schema_1.Spots.findOne({
        propertyId: spotData.propertyId,
        lotIdentifier: spotData.lotIdentifier,
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
    const property = yield properties_schema_1.Properties.findOne({
        _id: propertyId,
        isDeleted: false,
    });
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found");
    }
    // Build query
    const query = { propertyId, isDeleted: false };
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
    const spot = yield spots_schema_1.Spots.findOne({ _id: spotId, isDeleted: false });
    if (!spot) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Spot not found");
    }
    return spot;
});
const updateSpot = (spotId, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(spotId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid spot ID format");
    }
    const spot = yield spots_schema_1.Spots.findOne({ _id: spotId, isDeleted: false });
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
    // If updating lot identifier, check for uniqueness within the property
    if (updateData.lotIdentifier &&
        updateData.lotIdentifier !== spot.lotIdentifier) {
        const existingSpotByIdentifier = yield spots_schema_1.Spots.findOne({
            propertyId: spot.propertyId,
            lotIdentifier: updateData.lotIdentifier,
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
    const spot = yield spots_schema_1.Spots.findOne({ _id: spotId, isDeleted: false });
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
    console.log("🔍 Fetching all tenants...");
    const tenants = yield users_schema_1.Users.find({ role: "TENANT", isDeleted: false })
        .populate("propertyId", "name address")
        .populate("spotId", "spotNumber status size price description")
        .populate("leaseId", "leaseType leaseStart leaseEnd rentAmount additionalRentAmount depositAmount leaseStatus occupants pets specialRequests documents notes")
        .sort({ createdAt: -1 });
    console.log(`📊 Found ${tenants.length} tenants`);
    if (tenants.length === 0) {
        console.log("⚠️ No tenants found in database");
        return [];
    }
    // Transform the data to include lot number and lease info more prominently
    const tenantsWithLotNumber = tenants.map(tenant => {
        const tenantData = tenant.toObject();
        // Check tenant status - comprehensive validation
        const isTenantDataComplete = (user, activeLease) => {
            // Check if user is a tenant
            if (user.role !== "TENANT") {
                return false;
            }
            // 1. Check ALL required user fields are filled
            const hasRequiredUserFields = !!(user.name &&
                user.name.trim() !== "" &&
                user.email &&
                user.email.trim() !== "" &&
                user.phoneNumber &&
                user.phoneNumber.trim() !== "" &&
                user.preferredLocation &&
                user.preferredLocation.trim() !== "");
            // 2. Check if tenant is assigned to a property and spot
            const hasPropertyAndSpot = !!(user.propertyId &&
                user.propertyId._id &&
                user.spotId &&
                user.spotId._id);
            // 3. Check if tenant has an active lease with ACTIVE status
            const hasActiveLease = !!activeLease && activeLease.leaseStatus === "ACTIVE";
            // 4. Check if lease information is complete (if lease exists)
            const hasCompleteLeaseInfo = !activeLease ||
                (() => {
                    var _a, _b, _c, _d, _e;
                    // Check if ALL required lease fields are filled
                    const hasRequiredLeaseFields = !!(activeLease.tenantId &&
                        activeLease.spotId &&
                        activeLease.propertyId &&
                        activeLease.leaseType &&
                        activeLease.leaseStart &&
                        activeLease.occupants &&
                        activeLease.occupants > 0);
                    // Check lease type specific requirements
                    const hasValidLeaseType = (activeLease.leaseType === "FIXED_TERM" && activeLease.leaseEnd) ||
                        (activeLease.leaseType === "MONTHLY" && !activeLease.leaseEnd);
                    // Check pet information if pets are present
                    const hasValidPetInfo = !((_a = activeLease.pets) === null || _a === void 0 ? void 0 : _a.hasPets) ||
                        (((_b = activeLease.pets) === null || _b === void 0 ? void 0 : _b.hasPets) &&
                            ((_c = activeLease.pets) === null || _c === void 0 ? void 0 : _c.petDetails) &&
                            ((_d = activeLease.pets) === null || _d === void 0 ? void 0 : _d.petDetails.length) > 0 &&
                            ((_e = activeLease.pets) === null || _e === void 0 ? void 0 : _e.petDetails.every((pet) => pet.type && pet.breed && pet.name)));
                    // Check ALL financial fields are properly set
                    const hasValidFinancials = typeof activeLease.rentAmount === "number" &&
                        activeLease.rentAmount > 0 &&
                        typeof activeLease.depositAmount === "number" &&
                        activeLease.depositAmount >= 0 &&
                        (activeLease.additionalRentAmount === undefined ||
                            activeLease.additionalRentAmount === null ||
                            (typeof activeLease.additionalRentAmount === "number" &&
                                activeLease.additionalRentAmount >= 0));
                    // Check if lease dates are valid
                    const hasValidDates = activeLease.leaseStart &&
                        new Date(activeLease.leaseStart) > new Date() &&
                        (activeLease.leaseType === "MONTHLY" ||
                            (activeLease.leaseType === "FIXED_TERM" &&
                                activeLease.leaseEnd &&
                                new Date(activeLease.leaseEnd) >
                                    new Date(activeLease.leaseStart)));
                    return (hasRequiredLeaseFields &&
                        hasValidLeaseType &&
                        hasValidPetInfo &&
                        hasValidFinancials &&
                        hasValidDates);
                })();
            // 5. Check if RV information is provided (if user has RV)
            const hasRvInfo = !user.rvInfo ||
                !!(user.rvInfo.make &&
                    user.rvInfo.make.trim() !== "" &&
                    user.rvInfo.model &&
                    user.rvInfo.model.trim() !== "" &&
                    user.rvInfo.year &&
                    user.rvInfo.length &&
                    user.rvInfo.licensePlate &&
                    user.rvInfo.licensePlate.trim() !== "");
            // 6. Check if emergency contact is provided
            const hasEmergencyContact = !!(user.emergencyContact &&
                user.emergencyContact.name &&
                user.emergencyContact.name.trim() !== "" &&
                user.emergencyContact.phone &&
                user.emergencyContact.phone.trim() !== "" &&
                user.emergencyContact.relationship &&
                user.emergencyContact.relationship.trim() !== "");
            // ALL conditions must be met for tenant status to be true
            return (hasRequiredUserFields &&
                hasPropertyAndSpot &&
                hasActiveLease &&
                hasCompleteLeaseInfo &&
                hasRvInfo &&
                hasEmergencyContact);
        };
        // Get active lease for tenant status check
        const activeLease = tenantData.leaseId;
        const tenantStatus = isTenantDataComplete(tenantData, activeLease);
        // Add tenant status to the response
        tenantData.tenantStatus = tenantStatus;
        console.log(`👤 Tenant: ${tenantData.name} - Status: ${tenantStatus}`);
        console.log(`   - Has property: ${!!tenantData.propertyId}`);
        console.log(`   - Has spot: ${!!tenantData.spotId}`);
        console.log(`   - Has lease: ${!!activeLease}`);
        if (activeLease) {
            console.log(`   - Lease status: ${activeLease.leaseStatus}`);
            console.log(`   - Rent amount: ${activeLease.rentAmount}`);
            console.log(`   - Deposit amount: ${activeLease.depositAmount}`);
        }
        // Add property info as a direct field for easier access
        if (tenantData.propertyId && typeof tenantData.propertyId === "object") {
            tenantData.property = {
                id: tenantData.propertyId._id,
                name: tenantData.propertyId.name,
                address: tenantData.propertyId.address,
            };
            // Remove the original propertyId to avoid duplication
            delete tenantData.propertyId;
        }
        // Add lot number as a direct field for easier access
        if (tenantData.spotId && typeof tenantData.spotId === "object") {
            tenantData.lotNumber = tenantData.spotId.spotNumber;
            tenantData.lotStatus = tenantData.spotId.status;
            tenantData.lotSize = tenantData.spotId.size;
            tenantData.lotPrice = tenantData.spotId.price;
            tenantData.lotDescription = tenantData.spotId.description;
            // Remove the original spotId to avoid duplication
            delete tenantData.spotId;
        }
        // Add lease info as a direct field for easier access
        if (tenantData.leaseId && typeof tenantData.leaseId === "object") {
            tenantData.lease = {
                id: tenantData.leaseId._id,
                leaseType: tenantData.leaseId.leaseType,
                leaseStart: tenantData.leaseId.leaseStart,
                leaseEnd: tenantData.leaseId.leaseEnd,
                rentAmount: tenantData.leaseId.rentAmount, // Base rent amount
                additionalRentAmount: tenantData.leaseId.additionalRentAmount || 0, // Additional rent amount
                totalRentAmount: (tenantData.leaseId.rentAmount || 0) +
                    (tenantData.leaseId.additionalRentAmount || 0), // Total rent amount
                depositAmount: tenantData.leaseId.depositAmount,
                leaseStatus: tenantData.leaseId.leaseStatus,
                occupants: tenantData.leaseId.occupants,
                pets: tenantData.leaseId.pets,
                specialRequests: tenantData.leaseId.specialRequests,
                documents: tenantData.leaseId.documents,
                notes: tenantData.leaseId.notes,
            };
            // Remove the original leaseId to avoid duplication
            delete tenantData.leaseId;
        }
        else {
            tenantData.lease = null;
            // Remove the original leaseId to avoid duplication
            delete tenantData.leaseId;
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
    const serviceRequest = yield service_requests_schema_1.ServiceRequests.findOne({
        _id: requestId,
        isDeleted: false,
    })
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
    const filterConditions = {
        propertyId,
        isDeleted: false,
    };
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
    const filterConditions = {
        tenantId,
        isDeleted: false,
    };
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
        isDeleted: false,
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
    const totalRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        isDeleted: false,
    });
    const pendingRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        status: "PENDING",
        isDeleted: false,
    });
    const inProgressRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        status: "IN_PROGRESS",
        isDeleted: false,
    });
    const completedRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        status: "COMPLETED",
        isDeleted: false,
    });
    const urgentRequests = yield service_requests_schema_1.ServiceRequests.countDocuments({
        priority: "URGENT",
        status: { $ne: "COMPLETED" },
        isDeleted: false,
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
    const users = yield users_schema_1.Users.find({ isDeleted: false })
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
    const user = yield users_schema_1.Users.findOne({ _id: userId, isDeleted: false })
        .select("-password")
        .populate("propertyId", "name address")
        .populate("spotId", "spotNumber status size price description")
        .populate("leaseId", "leaseType leaseStart leaseEnd rentAmount additionalRentAmount depositAmount leaseStatus occupants pets specialRequests documents notes");
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
    const user = yield users_schema_1.Users.findOne({ _id: userId, isDeleted: false });
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
    const user = yield users_schema_1.Users.findOne({ _id: userId, isDeleted: false });
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
    const property = yield properties_schema_1.Properties.findOne({
        _id: propertyId,
        isDeleted: false,
    });
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
    const property = yield properties_schema_1.Properties.findOne({
        _id: propertyId,
        isDeleted: true,
    });
    if (!property) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Property not found or not archived");
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
    const spot = yield spots_schema_1.Spots.findOne({ _id: spotId, isDeleted: false });
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
    const spot = yield spots_schema_1.Spots.findOne({ _id: spotId, isDeleted: true });
    if (!spot) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Spot not found or not archived");
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
    const spots = yield spots_schema_1.Spots.find({
        isDeleted: true,
    }).populate("propertyId", "name");
    return spots;
});
const createTestLease = (leaseData) => __awaiter(void 0, void 0, void 0, function* () {
    const { LeasesService } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.service")));
    return yield LeasesService.createLease(leaseData);
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
    createTestLease,
    getPayments,
};
// Get all payments with filters/pagination (Admin)
function getPayments(filters, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = options.page || 1;
        const limit = options.limit || 10;
        const skip = (page - 1) * limit;
        const sortBy = options.sortBy || "createdAt";
        const sortOrder = options.sortOrder === "asc" ? 1 : -1;
        const query = { isDeleted: false };
        if (filters.status && typeof filters.status === "string") {
            query.status = filters.status;
        }
        if (filters.type && typeof filters.type === "string") {
            query.type = filters.type;
        }
        if (filters.propertyId && typeof filters.propertyId === "string") {
            query.propertyId = filters.propertyId;
        }
        if (filters.tenantId && typeof filters.tenantId === "string") {
            query.tenantId = filters.tenantId;
        }
        if (filters.spotId && typeof filters.spotId === "string") {
            query.spotId = filters.spotId;
        }
        if (filters.startDate || filters.endDate) {
            const dateFilter = {};
            if (typeof filters.startDate === "string") {
                dateFilter.$gte = new Date(filters.startDate);
            }
            if (typeof filters.endDate === "string") {
                dateFilter.$lte = new Date(filters.endDate);
            }
            query.createdAt = dateFilter;
        }
        const sortConditions = {};
        sortConditions[sortBy] = sortOrder;
        const payments = yield payments_schema_1.Payments.find(query)
            .populate("tenantId", "name email phoneNumber")
            .populate("propertyId", "name address")
            .populate("spotId", "spotNumber lotIdentifier")
            .sort(sortConditions)
            .skip(skip)
            .limit(limit);
        const total = yield payments_schema_1.Payments.countDocuments(query);
        // Transform results for admin UI convenience
        const data = payments.map(p => {
            const payment = p.toObject();
            return {
                id: payment._id,
                type: payment.type,
                status: payment.status,
                amount: payment.amount,
                lateFeeAmount: payment.lateFeeAmount || 0,
                totalAmount: payment.totalAmount,
                dueDate: payment.dueDate,
                paidDate: payment.paidDate,
                receiptNumber: payment.receiptNumber,
                description: payment.description,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
                tenant: payment.tenantId
                    ? {
                        id: payment.tenantId._id,
                        name: payment.tenantId.name,
                        email: payment.tenantId.email,
                        phoneNumber: payment.tenantId.phoneNumber,
                    }
                    : null,
                property: payment.propertyId
                    ? {
                        id: payment.propertyId._id,
                        name: payment.propertyId.name,
                        address: payment.propertyId.address,
                    }
                    : null,
                spot: payment.spotId
                    ? {
                        id: payment.spotId._id,
                        spotNumber: payment.spotId.spotNumber,
                        lotIdentifier: payment.spotId.lotIdentifier,
                    }
                    : null,
                stripe: {
                    paymentLinkId: payment.stripePaymentLinkId,
                    paymentIntentId: payment.stripePaymentIntentId,
                    transactionId: payment.stripeTransactionId,
                },
            };
        });
        return {
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            data,
        };
    });
}
