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
exports.LeasesService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const paginationHelpers_1 = require("../../../helpers/paginationHelpers");
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
    const lease = yield leases_schema_1.Leases.create(Object.assign(Object.assign({}, leaseData), { leaseStatus, paymentStatus: "PENDING" }));
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
const updateLease = (id, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const lease = yield leases_schema_1.Leases.findOne({ _id: id, isDeleted: false });
    if (!lease) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Lease not found");
    }
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
                totalRent: { $sum: "$rentAmount" },
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
