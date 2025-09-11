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
const leases_schema_1 = require("../leases/leases.schema");
const payment_service_1 = require("../payments/payment.service");
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
    // Update spot status to RESERVED (reserved for the invited tenant)
    yield spots_schema_1.Spots.findByIdAndUpdate(inviteData.spotId, { status: "RESERVED" });
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
// Helper function to calculate income for a property
const calculatePropertyIncome = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
    const { Spots } = yield Promise.resolve().then(() => __importStar(require("../spots/spots.schema")));
    // Calculate total current active income (sum of all active leases' total rent amounts)
    const activeLeases = yield Leases.find({
        propertyId: propertyId,
        leaseStatus: "ACTIVE",
        isDeleted: false,
    });
    const totalCurrentActiveIncome = activeLeases.reduce((sum, lease) => {
        return sum + (lease.rentAmount + (lease.additionalRentAmount || 0));
    }, 0);
    // Calculate total max income (sum of all spots' monthly prices)
    const allSpots = yield Spots.find({
        propertyId: propertyId,
        isDeleted: false,
    });
    const totalMaxIncome = allSpots.reduce((sum, spot) => {
        return sum + (spot.price.monthly || 0);
    }, 0);
    return {
        totalCurrentActiveIncome,
        totalMaxIncome,
    };
});
const getAllProperties = () => __awaiter(void 0, void 0, void 0, function* () {
    const properties = yield properties_schema_1.Properties.find({ isDeleted: false }).sort({
        createdAt: -1,
    });
    const propertiesWithLotData = yield (0, properties_service_1.addLotDataToProperties)(properties);
    // Add income calculations for each property
    const propertiesWithIncome = yield Promise.all(propertiesWithLotData.map((property) => __awaiter(void 0, void 0, void 0, function* () {
        const { totalCurrentActiveIncome, totalMaxIncome } = yield calculatePropertyIncome(property._id);
        return Object.assign(Object.assign({}, property), { totalCurrentActiveIncome,
            totalMaxIncome });
    })));
    return propertiesWithIncome;
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
    // Add income calculations for the property
    const { totalCurrentActiveIncome, totalMaxIncome } = yield calculatePropertyIncome(propertyId);
    return Object.assign(Object.assign({}, propertyWithLotData), { totalCurrentActiveIncome,
        totalMaxIncome });
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
        const validStatuses = ["AVAILABLE", "MAINTENANCE", "RESERVED", "BOOKED"];
        if (!validStatuses.includes(status.toUpperCase())) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid status. Must be one of: AVAILABLE, MAINTENANCE, RESERVED, BOOKED");
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
        .populate("leaseId", "leaseType leaseStart leaseEnd rentAmount additionalRentAmount depositAmount leaseStatus occupants pets specialRequests documents notes leaseAgreement")
        .sort({ createdAt: -1 });
    console.log(`📊 Found ${tenants.length} tenants`);
    if (tenants.length === 0) {
        console.log("⚠️ No tenants found in database");
        return [];
    }
    // Transform the data to include lot number, lease info, and payment status
    const tenantsWithLotNumber = yield Promise.all(tenants.map((tenant) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const tenantData = tenant.toObject();
        // Check tenant status - simplified validation
        const isTenantDataComplete = (user, activeLease) => {
            // Check if user is a tenant
            if (user.role !== "TENANT") {
                return false;
            }
            // Check if tenant has an active lease
            if (!activeLease || activeLease.leaseStatus !== "ACTIVE") {
                return false;
            }
            // Simplified tenantStatus logic - only check lease-related fields
            const hasLeaseType = !!activeLease.leaseType;
            const hasLeaseDates = !!(activeLease.leaseStart &&
                (activeLease.leaseType === "MONTHLY" ||
                    (activeLease.leaseType === "FIXED_TERM" && activeLease.leaseEnd)));
            const hasRentAmount = typeof activeLease.rentAmount === "number" &&
                activeLease.rentAmount > 0;
            const hasDepositAmount = typeof activeLease.depositAmount === "number" &&
                activeLease.depositAmount >= 0;
            const hasOccupants = typeof activeLease.occupants === "number" &&
                activeLease.occupants > 0;
            const hasLeaseAgreement = !!activeLease.leaseAgreement &&
                activeLease.leaseAgreement.trim() !== "";
            // ALL conditions must be met for tenant status to be true
            return (hasLeaseType &&
                hasLeaseDates &&
                hasRentAmount &&
                hasDepositAmount &&
                hasOccupants &&
                hasLeaseAgreement);
        };
        // Get active lease for tenant status check
        const activeLease = tenantData.leaseId;
        const tenantStatus = isTenantDataComplete(tenantData, activeLease);
        // Add tenant status to the response
        tenantData.tenantStatus = tenantStatus;
        // Calculate payment status for the tenant
        let paymentStatus = {
            currentStatus: "NO_PAYMENTS",
            lastPaymentDate: null,
            nextDueDate: null,
            overdueAmount: 0,
            totalOutstanding: 0,
            paymentHistory: [],
        };
        if (activeLease && tenantStatus) {
            try {
                // Get current date
                const currentDate = new Date();
                // Get all payments for this tenant
                const allPayments = yield payments_schema_1.Payments.find({
                    tenantId: tenantData._id,
                    isDeleted: false,
                }).sort({ dueDate: -1 });
                if (allPayments.length > 0) {
                    // Get the most recent payment
                    const lastPayment = allPayments[0];
                    // Get pending/overdue payments
                    const pendingPayments = allPayments.filter(payment => payment.status === "PENDING" || payment.status === "OVERDUE");
                    // Get paid payments
                    const paidPayments = allPayments.filter(payment => payment.status === "PAID");
                    // Calculate overdue amount
                    const overdueAmount = pendingPayments.reduce((sum, payment) => {
                        if (payment.dueDate < currentDate) {
                            return sum + payment.totalAmount;
                        }
                        return sum;
                    }, 0);
                    // Calculate total outstanding
                    const totalOutstanding = pendingPayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
                    // Determine current payment status
                    let currentStatus = "UP_TO_DATE";
                    if (overdueAmount > 0) {
                        currentStatus = "OVERDUE";
                    }
                    else if (totalOutstanding > 0) {
                        currentStatus = "PENDING";
                    }
                    else if (paidPayments.length > 0) {
                        currentStatus = "PAID";
                    }
                    // Get next due date (from pending payments)
                    const nextDuePayment = pendingPayments
                        .filter(payment => payment.dueDate >= currentDate)
                        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
                    paymentStatus = {
                        currentStatus,
                        lastPaymentDate: paidPayments.length > 0
                            ? ((_a = paidPayments[0].paidDate) !== null && _a !== void 0 ? _a : null)
                            : null,
                        nextDueDate: nextDuePayment ? nextDuePayment.dueDate : null,
                        overdueAmount,
                        totalOutstanding,
                        paymentHistory: allPayments.slice(0, 5).map(payment => ({
                            id: payment._id,
                            amount: payment.amount,
                            totalAmount: payment.totalAmount,
                            status: payment.status,
                            dueDate: payment.dueDate,
                            paidDate: payment.paidDate,
                            type: payment.type,
                            description: payment.description,
                        })),
                    };
                }
            }
            catch (error) {
                console.error(`Error calculating payment status for tenant ${tenantData.name}:`, error);
                // Keep default payment status if there's an error
            }
        }
        // Add payment status to the response
        tenantData.paymentStatus = paymentStatus;
        console.log(`👤 Tenant: ${tenantData.name} - Status: ${tenantStatus}`);
        console.log(`   💰 Payment Status: ${paymentStatus.currentStatus}`);
        if (activeLease) {
            console.log(`   - Lease type: ${activeLease.leaseType}`);
            console.log(`   - Lease status: ${activeLease.leaseStatus}`);
            console.log(`   - Rent amount: ${activeLease.rentAmount}`);
            console.log(`   - Deposit amount: ${activeLease.depositAmount}`);
            console.log(`   - Occupants: ${activeLease.occupants}`);
            console.log(`   - Has lease agreement: ${!!activeLease.leaseAgreement}`);
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
                leaseAgreement: tenantData.leaseId.leaseAgreement, // Add lease agreement field
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
    })));
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
// Remove lease agreement from a lease
const removeLeaseAgreement = (leaseId, reason, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(leaseId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid lease ID format");
    }
    // Check if admin exists and is authorized
    const admin = yield users_schema_1.Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "Only super admins can remove lease agreements");
    }
    // Import Leases schema
    const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
    // Find the lease
    const lease = yield Leases.findOne({
        _id: leaseId,
        isDeleted: false,
    });
    if (!lease) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Lease not found");
    }
    // Check if lease agreement exists
    if (!lease.leaseAgreement) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "No lease agreement found to remove");
    }
    // Remove the lease agreement and add admin note
    const updatedLease = yield Leases.findByIdAndUpdate(leaseId, {
        $unset: { leaseAgreement: 1 }, // Remove the leaseAgreement field
        $set: {
            notes: lease.notes
                ? `${lease.notes}\n\n[${new Date().toISOString()}] Lease agreement removed by admin (${admin.name}). Reason: ${reason}`
                : `[${new Date().toISOString()}] Lease agreement removed by admin (${admin.name}). Reason: ${reason}`,
        },
    }, { new: true, runValidators: true });
    if (!updatedLease) {
        throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to update lease");
    }
    console.log(`🔧 Admin ${admin.name} removed lease agreement from lease ${leaseId}. Reason: ${reason}`);
    return {
        message: "Lease agreement removed successfully",
        lease: updatedLease,
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
    updatePayment,
    removeLeaseAgreement,
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
// Update payment manually (Admin) - Handles both updating existing and creating new payments
function updatePayment(tenantId, updateData, adminId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate ObjectId format
        if (!mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid tenant ID format");
        }
        // Validate payment date
        const paidDate = new Date(updateData.paidDate);
        if (isNaN(paidDate.getTime())) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid payment date format");
        }
        // Get tenant and lease information
        const tenant = yield users_schema_1.Users.findById(tenantId);
        if (!tenant || tenant.isDeleted || !tenant.isActive) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Tenant not found or inactive");
        }
        const activeLease = yield leases_schema_1.Leases.findOne({
            tenantId: tenantId,
            leaseStatus: "ACTIVE",
            isDeleted: false,
        }).populate("propertyId spotId");
        if (!activeLease) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "No active lease found for this tenant");
        }
        // Try to find existing pending or overdue payment first
        let existingPayment = yield payments_schema_1.Payments.findOne({
            tenantId: tenantId,
            status: { $in: ["PENDING", "OVERDUE"] },
            isDeleted: false,
        }).sort({ dueDate: 1 });
        let updatedPayment;
        if (existingPayment) {
            // Scenario 1: Update existing pending/overdue payment
            console.log("Updating existing payment:", existingPayment._id);
            const updateFields = {
                amount: updateData.amount,
                paidDate: paidDate,
                status: "PAID", // Mark as paid when manually updated
                paymentMethod: "MANUAL", // Mark as manual payment
                updatedAt: new Date(),
            };
            // Add optional fields if provided
            if (updateData.description) {
                updateFields.description = updateData.description;
            }
            if (updateData.notes) {
                updateFields.notes = updateData.notes;
            }
            // Update the existing payment
            updatedPayment = yield payments_schema_1.Payments.findByIdAndUpdate(existingPayment._id, updateFields, { new: true, runValidators: true }).populate([
                {
                    path: "tenantId",
                    select: "name email phoneNumber",
                },
                {
                    path: "propertyId",
                    select: "name address",
                },
                {
                    path: "spotId",
                    select: "spotNumber lotIdentifier",
                },
            ]);
        }
        else {
            // Scenario 2: Create new payment record
            console.log("Creating new payment for tenant:", tenantId);
            // Determine payment type and due date
            const paymentType = updateData.type || "RENT";
            // For first-time payments, default due date should be lease start date
            // For regular payments, default to current date
            const existingPayments = yield payments_schema_1.Payments.find({
                tenantId: tenantId,
                type: "RENT",
                isDeleted: false,
            });
            const isFirstTimePayment = existingPayments.length === 0;
            const dueDate = updateData.dueDate
                ? new Date(updateData.dueDate)
                : isFirstTimePayment
                    ? activeLease.leaseStart // First payment due on lease start date
                    : new Date(); // Regular payment due today
            // Debug logging for dates
            console.log("🔍 DEBUG - Date Information:");
            console.log("  - Lease Start Date:", activeLease.leaseStart);
            console.log("  - Lease End Date:", activeLease.leaseEnd);
            console.log("  - Payment Due Date:", dueDate);
            console.log("  - Current Date:", new Date());
            console.log("  - Due Date < Lease Start?", dueDate < activeLease.leaseStart);
            console.log("  - Due Date > Lease End?", activeLease.leaseEnd
                ? dueDate > activeLease.leaseEnd
                : "No lease end date");
            console.log("  - Update Data Due Date:", updateData.dueDate);
            // Validate due date
            if (isNaN(dueDate.getTime())) {
                throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid due date format");
            }
            // Generate receipt number
            const timestamp = Date.now().toString();
            const random = Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, "0");
            const receiptNumber = `RCP-${timestamp}-${random}`;
            // isFirstTimePayment already determined above
            // Calculate pro-rated amount for first-time payments if needed
            let finalAmount = updateData.amount;
            let description = updateData.description;
            if (isFirstTimePayment && paymentType === "RENT" && !description) {
                const leaseStart = activeLease.leaseStart;
                const leaseStartDay = leaseStart.getDate();
                if (leaseStartDay > 1) {
                    // Pro-rated first month calculation
                    const daysInMonth = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + 1, 0).getDate();
                    const remainingDays = daysInMonth - leaseStartDay + 1;
                    const totalRentAmount = activeLease.rentAmount + (activeLease.additionalRentAmount || 0);
                    const proRatedRent = Math.round((totalRentAmount / daysInMonth) * remainingDays);
                    const expectedAmount = proRatedRent + activeLease.depositAmount;
                    // If the provided amount matches the expected pro-rated amount, use pro-rated description
                    if (Math.abs(updateData.amount - expectedAmount) < 1) {
                        // Allow for small rounding differences
                        description = `Pro-rated First Month Rent (${remainingDays} days) + Deposit`;
                    }
                    else {
                        description = "First Month Rent + Deposit";
                    }
                }
                else {
                    // Full first month
                    description = "First Month Rent + Deposit";
                }
            }
            else if (!description) {
                description = `Manual ${paymentType} Payment`;
            }
            // Create new payment record
            const newPaymentData = {
                tenantId: tenantId,
                propertyId: activeLease.propertyId._id,
                spotId: activeLease.spotId._id,
                amount: updateData.amount,
                type: paymentType,
                status: "PAID", // Mark as paid since it's a manual payment
                dueDate: dueDate,
                paidDate: paidDate,
                paymentMethod: "MANUAL",
                description: description,
                notes: updateData.notes,
                lateFeeAmount: 0,
                totalAmount: updateData.amount,
                receiptNumber: receiptNumber,
                createdBy: adminId,
                isActive: true,
                isDeleted: false,
            };
            // Create the new payment
            updatedPayment = yield payments_schema_1.Payments.create(newPaymentData);
            // Populate the created payment
            updatedPayment = yield payments_schema_1.Payments.findById(updatedPayment._id).populate([
                {
                    path: "tenantId",
                    select: "name email phoneNumber",
                },
                {
                    path: "propertyId",
                    select: "name address",
                },
                {
                    path: "spotId",
                    select: "spotNumber lotIdentifier",
                },
            ]);
        }
        if (!updatedPayment) {
            throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to process payment");
        }
        // Update rent summary to reflect the latest payment data
        try {
            yield payment_service_1.PaymentService.getRentSummary(tenantId);
            console.log(`Rent summary updated for tenant: ${tenantId}`);
        }
        catch (error) {
            console.error(`Failed to update rent summary for tenant ${tenantId}:`, error);
            // Don't throw error here as payment was successful, just log the issue
        }
        // Return the payment in the same format as getPayments
        const paymentData = updatedPayment.toObject();
        return {
            id: paymentData._id,
            type: paymentData.type,
            status: paymentData.status,
            amount: paymentData.amount,
            lateFeeAmount: paymentData.lateFeeAmount || 0,
            totalAmount: paymentData.totalAmount,
            dueDate: paymentData.dueDate,
            paidDate: paymentData.paidDate,
            receiptNumber: paymentData.receiptNumber,
            description: paymentData.description,
            notes: paymentData.notes,
            paymentMethod: paymentData.paymentMethod,
            createdAt: paymentData.createdAt,
            updatedAt: paymentData.updatedAt,
            tenant: paymentData.tenantId
                ? {
                    id: paymentData.tenantId._id,
                    name: paymentData.tenantId.name,
                    email: paymentData.tenantId.email,
                    phoneNumber: paymentData.tenantId.phoneNumber,
                }
                : null,
            property: paymentData.propertyId
                ? {
                    id: paymentData.propertyId._id,
                    name: paymentData.propertyId.name,
                    address: paymentData.propertyId.address,
                }
                : null,
            spot: paymentData.spotId
                ? {
                    id: paymentData.spotId._id,
                    spotNumber: paymentData.spotId.spotNumber,
                    lotIdentifier: paymentData.spotId.lotIdentifier,
                }
                : null,
            stripe: {
                paymentLinkId: paymentData.stripePaymentLinkId,
                paymentIntentId: paymentData.stripePaymentIntentId,
                transactionId: paymentData.stripeTransactionId,
            },
        };
    });
}
