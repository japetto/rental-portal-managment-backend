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
exports.LeasesService = exports.checkAndSendLeaseReadyNotification = void 0;
const http_status_1 = __importDefault(require("http-status"));
const mongoose_1 = require("mongoose");
const config_1 = __importDefault(require("../../../config/config"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const paginationHelpers_1 = require("../../../helpers/paginationHelpers");
const emailService_1 = require("../../../shared/emailService");
const payment_enums_1 = require("../../../shared/enums/payment.enums");
const leases_schema_1 = require("./leases.schema");
const createLease = (leaseData) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate lease type and end date logic
    if (leaseData.leaseType === "FIXED_TERM" && !leaseData.leaseEnd) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Lease end date is required for FIXED_TERM leases");
    }
    if (leaseData.leaseType === "MONTHLY" && leaseData.leaseEnd) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Lease end date should not be provided for MONTHLY leases");
    }
    // Validate pet details if hasPets is true
    if (leaseData.pets.hasPets &&
        (!leaseData.pets.petDetails || leaseData.pets.petDetails.length === 0)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Pet details are required when hasPets is true");
    }
    // Set default lease status based on start date
    const now = new Date();
    const leaseStatus = leaseData.leaseStart <= now ? payment_enums_1.LeaseStatus.ACTIVE : payment_enums_1.LeaseStatus.PENDING;
    // Ensure additionalRentAmount defaults to 0 if not provided
    const leaseDataWithDefaults = Object.assign(Object.assign({}, leaseData), { additionalRentAmount: leaseData.additionalRentAmount || 0, leaseStatus, paymentStatus: "PENDING" });
    const lease = yield leases_schema_1.Leases.create(leaseDataWithDefaults);
    return lease;
});
const getAllLeases = (filters, paginationOptions) => __awaiter(void 0, void 0, void 0, function* () {
    const { searchTerm, leaseType, leaseStatus, propertyId, tenantId } = filters, filtersData = __rest(filters, ["searchTerm", "leaseType", "leaseStatus", "propertyId", "tenantId"]);
    const andConditions = [
        { isDeleted: false }, // Only get non-deleted leases
    ];
    if (searchTerm) {
        andConditions.push({
            $or: [
                {
                    "rvInfo.make": {
                        $regex: searchTerm,
                        $options: "i",
                    },
                },
                {
                    "rvInfo.model": {
                        $regex: searchTerm,
                        $options: "i",
                    },
                },
                {
                    "rvInfo.licensePlate": {
                        $regex: searchTerm,
                        $options: "i",
                    },
                },
            ],
        });
    }
    if (leaseType) {
        andConditions.push({
            leaseType: leaseType,
        });
    }
    if (leaseStatus) {
        andConditions.push({
            leaseStatus: leaseStatus,
        });
    }
    if (propertyId) {
        andConditions.push({
            propertyId: new mongoose_1.Types.ObjectId(propertyId),
        });
    }
    if (tenantId) {
        andConditions.push({
            tenantId: new mongoose_1.Types.ObjectId(tenantId),
        });
    }
    if (Object.keys(filtersData).length) {
        andConditions.push({
            $and: Object.entries(filtersData).map(([field, value]) => ({
                [field]: value,
            })),
        });
    }
    const whereConditions = andConditions.length > 0 ? { $and: andConditions } : {};
    const { page, limit, skip, sortBy, sortOrder } = (0, paginationHelpers_1.calculatePaginationFunction)(paginationOptions);
    const sortConditions = {};
    if (sortBy && sortOrder) {
        sortConditions[sortBy] = sortOrder === "desc" ? -1 : 1;
    }
    const result = yield leases_schema_1.Leases.find(whereConditions)
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation")
        .populate("spotId", "spotNumber spotType")
        .populate("propertyId", "name address")
        .sort(sortConditions)
        .skip(skip)
        .limit(limit);
    const total = yield leases_schema_1.Leases.countDocuments(whereConditions);
    return {
        meta: {
            page,
            limit,
            total,
        },
        data: result,
    };
});
const getLeaseById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const lease = yield leases_schema_1.Leases.findOne({ _id: id, isDeleted: false })
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation")
        .populate("spotId", "spotNumber spotType")
        .populate("propertyId", "name address");
    if (!lease) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Lease not found");
    }
    return lease;
});
const getLeasesByTenant = (tenantId, filters, paginationOptions) => __awaiter(void 0, void 0, void 0, function* () {
    const { leaseStatus, leaseType } = filters, filtersData = __rest(filters, ["leaseStatus", "leaseType"]);
    const andConditions = [
        { isDeleted: false }, // Only get non-deleted leases
    ];
    andConditions.push({ tenantId: new mongoose_1.Types.ObjectId(tenantId) });
    if (leaseStatus) {
        andConditions.push({ leaseStatus });
    }
    if (leaseType) {
        andConditions.push({ leaseType });
    }
    if (Object.keys(filtersData).length) {
        andConditions.push({
            $and: Object.entries(filtersData).map(([field, value]) => ({
                [field]: value,
            })),
        });
    }
    let whereConditions = {};
    if (andConditions.length === 1) {
        whereConditions = andConditions[0];
    }
    else if (andConditions.length > 1) {
        whereConditions = { $and: andConditions };
    }
    const { page, limit, skip, sortBy, sortOrder } = (0, paginationHelpers_1.calculatePaginationFunction)(paginationOptions);
    const sortConditions = {};
    if (sortBy && sortOrder) {
        sortConditions[sortBy] = sortOrder === "desc" ? -1 : 1;
    }
    const result = yield leases_schema_1.Leases.find(whereConditions)
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation")
        .populate("spotId", "spotNumber spotType")
        .populate("propertyId", "name address")
        .sort(sortConditions)
        .skip(skip)
        .limit(limit);
    const total = yield leases_schema_1.Leases.countDocuments(whereConditions);
    return {
        meta: {
            page,
            limit,
            total,
        },
        data: result,
    };
});
// Helper function to check if lease is complete
const isLeaseComplete = (lease) => {
    // Check if all required fields are filled
    const hasRequiredFields = lease.tenantId &&
        lease.spotId &&
        lease.propertyId &&
        lease.leaseType &&
        lease.leaseStart &&
        lease.occupants;
    // Check that depositAmount is provided and valid (required)
    const hasValidDepositAmount = typeof lease.depositAmount === "number" && lease.depositAmount >= 0;
    // Check lease type specific requirements
    const hasValidLeaseType = (lease.leaseType === payment_enums_1.LeaseType.FIXED_TERM && lease.leaseEnd) ||
        (lease.leaseType === payment_enums_1.LeaseType.MONTHLY && !lease.leaseEnd);
    // Check pet information if pets are present
    const hasValidPetInfo = !lease.pets.hasPets ||
        (lease.pets.hasPets &&
            lease.pets.petDetails &&
            lease.pets.petDetails.length > 0);
    // Check that additional rent amount is valid (optional - only validate if provided)
    const hasValidAdditionalRent = lease.additionalRentAmount === undefined ||
        lease.additionalRentAmount === null ||
        lease.additionalRentAmount >= 0;
    // Check that leaseAgreement is provided (required)
    const hasLeaseAgreement = !!lease.leaseAgreement && lease.leaseAgreement.trim() !== "";
    return (hasRequiredFields &&
        hasValidLeaseType &&
        hasValidPetInfo &&
        hasValidAdditionalRent &&
        hasLeaseAgreement &&
        hasValidDepositAmount);
};
// Helper function to check and send lease ready notification
const checkAndSendLeaseReadyNotification = (leaseId, previousLease) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    console.log(`🔔 Starting lease notification check for lease ${leaseId}`);
    try {
        const { Leases } = yield Promise.resolve().then(() => __importStar(require("./leases.schema")));
        // Populate the lease with tenant, property, and spot information
        const populatedLease = yield Leases.findById(leaseId)
            .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation")
            .populate("spotId", "spotNumber spotType spotIdentifier")
            .populate("propertyId", "name address");
        if (!populatedLease) {
            console.warn(`⚠️ Lease ${leaseId} not found for notification check`);
            return;
        }
        // Safely extract values to avoid circular reference issues
        const tenantEmail = populatedLease.tenantId
            ? ((_a = populatedLease.tenantId) === null || _a === void 0 ? void 0 : _a.email) || "N/A"
            : "N/A";
        const propertyName = populatedLease.propertyId
            ? ((_b = populatedLease.propertyId) === null || _b === void 0 ? void 0 : _b.name) || "N/A"
            : "N/A";
        const spotNumber = populatedLease.spotId
            ? ((_c = populatedLease.spotId) === null || _c === void 0 ? void 0 : _c.spotNumber) ||
                ((_d = populatedLease.spotId) === null || _d === void 0 ? void 0 : _d.spotIdentifier) ||
                "N/A"
            : "N/A";
        console.log(`📋 Lease found: ${leaseId}`);
        console.log(`   - Tenant: ${tenantEmail}`);
        console.log(`   - Property: ${propertyName}`);
        console.log(`   - Spot: ${spotNumber}`);
        console.log(`   - Lease Agreement: ${populatedLease.leaseAgreement ? "Present" : "Missing"}`);
        console.log(`   - Deposit Amount: ${populatedLease.depositAmount || 0}`);
        console.log(`   - Lease Type: ${populatedLease.leaseType || "N/A"}`);
        console.log(`   - Lease End: ${populatedLease.leaseEnd ? populatedLease.leaseEnd.toISOString() : "N/A"}`);
        // Check if lease is complete
        const isComplete = isLeaseComplete(populatedLease);
        console.log(`   - Is Complete: ${isComplete}`);
        // Only send notification if:
        // 1. Lease is now complete AND
        // 2. It wasn't complete before (or it's a new lease)
        const wasCompleteBefore = previousLease
            ? isLeaseComplete(previousLease)
            : false;
        console.log(`   - Was Complete Before: ${wasCompleteBefore}`);
        if (isComplete && !wasCompleteBefore) {
            const tenant = populatedLease.tenantId;
            const property = populatedLease.propertyId;
            const spot = populatedLease.spotId;
            console.log(`📧 Preparing to send notification...`);
            console.log(`   - Tenant Email: ${(tenant === null || tenant === void 0 ? void 0 : tenant.email) || "Missing"}`);
            console.log(`   - Tenant Name: ${(tenant === null || tenant === void 0 ? void 0 : tenant.name) || "Missing"}`);
            console.log(`   - Property Name: ${(property === null || property === void 0 ? void 0 : property.name) || "Missing"}`);
            console.log(`   - Spot Number: ${(spot === null || spot === void 0 ? void 0 : spot.spotNumber) || (spot === null || spot === void 0 ? void 0 : spot.spotIdentifier) || "Missing"}`);
            // Only send notification if we have all required information
            if ((tenant === null || tenant === void 0 ? void 0 : tenant.email) &&
                (tenant === null || tenant === void 0 ? void 0 : tenant.name) &&
                (property === null || property === void 0 ? void 0 : property.name) &&
                ((spot === null || spot === void 0 ? void 0 : spot.spotNumber) || (spot === null || spot === void 0 ? void 0 : spot.spotIdentifier))) {
                const dashboardUrl = `${config_1.default.client_url}/my-info`;
                const spotNumber = spot.spotNumber || spot.spotIdentifier || "N/A";
                console.log(`📤 Sending email to ${tenant.email}...`);
                yield (0, emailService_1.sendLeaseReadyNotification)(tenant.email, tenant.name, property.name, spotNumber, dashboardUrl);
                console.log(`✅ Lease ready notification sent successfully to tenant ${tenant.email} for lease ${leaseId}`);
            }
            else {
                console.warn(`⚠️ Cannot send lease ready notification: missing required information for lease ${leaseId}`);
                console.warn(`   Missing: ${!(tenant === null || tenant === void 0 ? void 0 : tenant.email) ? "email, " : ""}${!(tenant === null || tenant === void 0 ? void 0 : tenant.name) ? "name, " : ""}${!(property === null || property === void 0 ? void 0 : property.name) ? "property name, " : ""}${!(spot === null || spot === void 0 ? void 0 : spot.spotNumber) && !(spot === null || spot === void 0 ? void 0 : spot.spotIdentifier) ? "spot number" : ""}`);
            }
        }
        else if (!isComplete) {
            console.log(`ℹ️ Lease ${leaseId} is not complete yet. Missing required fields.`);
        }
        else if (wasCompleteBefore) {
            console.log(`ℹ️ Lease ${leaseId} was already complete. Notification not sent to avoid duplicates.`);
        }
    }
    catch (error) {
        // Log error but don't fail the lease update if email fails
        console.error(`❌ Error checking/sending lease ready notification for lease ${leaseId}:`, error);
        if (error instanceof Error) {
            console.error(`   Error message: ${error.message}`);
            console.error(`   Error stack: ${error.stack}`);
        }
    }
});
exports.checkAndSendLeaseReadyNotification = checkAndSendLeaseReadyNotification;
const updateLease = (id, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const lease = yield leases_schema_1.Leases.findOne({ _id: id, isDeleted: false });
    if (!lease) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Lease not found");
    }
    // Store previous lease state to check if it was complete before
    const previousLease = lease.toObject();
    // Validate lease type and end date logic for updates
    if (updateData.leaseType === "FIXED_TERM" &&
        !updateData.leaseEnd &&
        !lease.leaseEnd) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Lease end date is required for FIXED_TERM leases");
    }
    if (updateData.leaseType === "MONTHLY" && updateData.leaseEnd) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Lease end date should not be provided for MONTHLY leases");
    }
    // Validate pet details if hasPets is being updated to true
    if (((_a = updateData.pets) === null || _a === void 0 ? void 0 : _a.hasPets) &&
        (!updateData.pets.petDetails || updateData.pets.petDetails.length === 0)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Pet details are required when hasPets is true");
    }
    // Update lease status based on dates if leaseStart or leaseEnd is being updated
    if (updateData.leaseStart || updateData.leaseEnd) {
        const startDate = updateData.leaseStart || lease.leaseStart;
        const endDate = updateData.leaseEnd || lease.leaseEnd;
        const now = new Date();
        if (startDate <= now && (!endDate || endDate >= now)) {
            updateData.leaseStatus = payment_enums_1.LeaseStatus.ACTIVE;
        }
        else if (endDate && endDate < now) {
            updateData.leaseStatus = payment_enums_1.LeaseStatus.EXPIRED;
        }
        else if (startDate > now) {
            updateData.leaseStatus = payment_enums_1.LeaseStatus.PENDING;
        }
    }
    const updatedLease = yield leases_schema_1.Leases.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    })
        .populate("tenantId", "name email phoneNumber profileImage bio preferredLocation")
        .populate("spotId", "spotNumber spotType")
        .populate("propertyId", "name address");
    // Check if lease is complete and send notification (only if it became complete)
    if (updatedLease) {
        // Check notification asynchronously to avoid blocking
        (0, exports.checkAndSendLeaseReadyNotification)(id, previousLease).catch(error => {
            console.error(`Error in notification check for lease ${id}:`, error);
        });
    }
    return updatedLease;
});
const deleteLease = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const lease = yield leases_schema_1.Leases.findOne({ _id: id, isDeleted: false });
    if (!lease) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Lease not found");
    }
    // Soft delete the lease
    const deletedLease = yield leases_schema_1.Leases.findByIdAndUpdate(id, {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
    }, { new: true });
    return deletedLease;
});
const getActiveLeasesByProperty = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    const activeLeases = yield leases_schema_1.Leases.find({
        propertyId: new mongoose_1.Types.ObjectId(propertyId),
        leaseStatus: "ACTIVE",
        isDeleted: false,
    })
        .populate("tenantId", "name email phoneNumber")
        .populate("spotId", "spotNumber spotType");
    return activeLeases;
});
const getLeaseStatistics = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    const matchCondition = propertyId
        ? { propertyId: new mongoose_1.Types.ObjectId(propertyId), isDeleted: false }
        : { isDeleted: false };
    const stats = yield leases_schema_1.Leases.aggregate([
        { $match: matchCondition },
        {
            $group: {
                _id: null,
                totalLeases: { $sum: 1 },
                activeLeases: {
                    $sum: { $cond: [{ $eq: ["$leaseStatus", "ACTIVE"] }, 1, 0] },
                },
                pendingLeases: {
                    $sum: { $cond: [{ $eq: ["$leaseStatus", "PENDING"] }, 1, 0] },
                },
                expiredLeases: {
                    $sum: { $cond: [{ $eq: ["$leaseStatus", "EXPIRED"] }, 1, 0] },
                },
                monthlyLeases: {
                    $sum: { $cond: [{ $eq: ["$leaseType", "MONTHLY"] }, 1, 0] },
                },
                fixedTermLeases: {
                    $sum: { $cond: [{ $eq: ["$leaseType", "FIXED_TERM"] }, 1, 0] },
                },
                totalBaseRent: { $sum: "$rentAmount" },
                totalAdditionalRent: { $sum: "$additionalRentAmount" },
                totalRent: { $sum: { $add: ["$rentAmount", "$additionalRentAmount"] } },
                totalDeposits: { $sum: "$depositAmount" },
            },
        },
    ]);
    return (stats[0] || {
        totalLeases: 0,
        activeLeases: 0,
        pendingLeases: 0,
        expiredLeases: 0,
        monthlyLeases: 0,
        fixedTermLeases: 0,
        totalBaseRent: 0,
        totalAdditionalRent: 0,
        totalRent: 0,
        totalDeposits: 0,
    });
});
exports.LeasesService = {
    createLease,
    getAllLeases,
    getLeaseById,
    getLeasesByTenant,
    updateLease,
    deleteLease,
    getActiveLeasesByProperty,
    getLeaseStatistics,
};
