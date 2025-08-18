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
exports.LeasesController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const leases_service_1 = require("./leases.service");
// Helper function to format lease data based on user role
const formatLeaseData = (lease, userRole) => {
    const leaseData = lease.toObject();
    if (userRole === "SUPER_ADMIN") {
        // Admin sees both base rent and additional rent separately
        return Object.assign(Object.assign({}, leaseData), { rentAmount: leaseData.rentAmount, additionalRentAmount: leaseData.additionalRentAmount || 0, totalRentAmount: leaseData.totalRentAmount });
    }
    else {
        // Tenant sees only the total rent amount (combined)
        return Object.assign(Object.assign({}, leaseData), { rentAmount: leaseData.totalRentAmount, additionalRentAmount: undefined, totalRentAmount: leaseData.totalRentAmount });
    }
};
// Helper function to format lease array data based on user role
const formatLeaseArrayData = (leases, userRole) => {
    return leases.map(lease => formatLeaseData(lease, userRole));
};
const createLease = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield leases_service_1.LeasesService.createLease(req.body);
    const formattedResult = formatLeaseData(result, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Lease created successfully",
        data: formattedResult,
    });
}));
const getAllLeases = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const filters = req.query;
    const paginationOptions = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
    };
    const result = yield leases_service_1.LeasesService.getAllLeases(filters, paginationOptions);
    const formattedData = formatLeaseArrayData(result.data, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
    res.status(http_status_1.default.OK).json({
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Leases retrieved successfully",
        meta: result.meta,
        data: formattedData,
    });
}));
const getLeaseById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const result = yield leases_service_1.LeasesService.getLeaseById(id);
    const formattedResult = formatLeaseData(result, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Lease retrieved successfully",
        data: formattedResult,
    });
}));
const getLeasesByTenant = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { tenantId } = req.params;
    const filters = {
        leaseStatus: req.query.status,
        leaseType: req.query.leaseType,
    };
    const paginationOptions = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
    };
    const result = yield leases_service_1.LeasesService.getLeasesByTenant(tenantId, filters, paginationOptions);
    const formattedData = formatLeaseArrayData(result.data, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
    res.status(http_status_1.default.OK).json({
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Tenant leases retrieved successfully",
        meta: result.meta,
        data: formattedData,
    });
}));
const updateLease = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const result = yield leases_service_1.LeasesService.updateLease(id, req.body);
    const formattedResult = formatLeaseData(result, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Lease updated successfully",
        data: formattedResult,
    });
}));
const deleteLease = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const result = yield leases_service_1.LeasesService.deleteLease(id);
    const formattedResult = formatLeaseData(result, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Lease deleted successfully",
        data: formattedResult,
    });
}));
const getActiveLeasesByProperty = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { propertyId } = req.params;
    const result = yield leases_service_1.LeasesService.getActiveLeasesByProperty(propertyId);
    const formattedData = formatLeaseArrayData(result, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Active leases retrieved successfully",
        data: formattedData,
    });
}));
const getLeaseStatistics = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { propertyId } = req.query;
    const result = yield leases_service_1.LeasesService.getLeaseStatistics(propertyId);
    // Format statistics based on user role
    const formattedStats = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === "SUPER_ADMIN"
        ? Object.assign(Object.assign({}, result), { 
            // Admin sees detailed breakdown
            totalBaseRent: result.totalBaseRent, totalAdditionalRent: result.totalAdditionalRent, totalRent: result.totalRent }) : Object.assign(Object.assign({}, result), { 
        // Tenant sees only total rent
        totalRent: result.totalRent, totalBaseRent: undefined, totalAdditionalRent: undefined });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Lease statistics retrieved successfully",
        data: formattedStats,
    });
}));
exports.LeasesController = {
    createLease,
    getAllLeases,
    getLeaseById,
    getLeasesByTenant,
    updateLease,
    deleteLease,
    getActiveLeasesByProperty,
    getLeaseStatistics,
};
