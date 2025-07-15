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
exports.permanentDelete = exports.getAllRecords = exports.getDeletedRecords = exports.getActiveRecords = exports.restoreRecord = exports.softDelete = void 0;
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
// Utility function for soft delete
const softDelete = (model, id, deletedBy) => __awaiter(void 0, void 0, void 0, function* () {
    const updateData = {
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
    };
    // Add deletedBy if provided
    if (deletedBy) {
        updateData.deletedBy = deletedBy;
    }
    const result = yield model.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });
    if (!result) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Record not found");
    }
    return result;
});
exports.softDelete = softDelete;
// Utility function to restore soft deleted record
const restoreRecord = (model, id, restoredBy) => __awaiter(void 0, void 0, void 0, function* () {
    const updateData = {
        isActive: true,
        isDeleted: false,
        deletedAt: null,
    };
    // Add restoredBy if provided
    if (restoredBy) {
        updateData.restoredBy = restoredBy;
    }
    const result = yield model.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });
    if (!result) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Record not found");
    }
    return result;
});
exports.restoreRecord = restoreRecord;
// Utility function to get only active records
const getActiveRecords = (model_1, ...args_1) => __awaiter(void 0, [model_1, ...args_1], void 0, function* (model, query = {}) {
    return yield model.find(Object.assign(Object.assign({}, query), { isDeleted: false }));
});
exports.getActiveRecords = getActiveRecords;
// Utility function to get deleted records
const getDeletedRecords = (model_1, ...args_1) => __awaiter(void 0, [model_1, ...args_1], void 0, function* (model, query = {}) {
    return yield model.find(Object.assign(Object.assign({}, query), { isDeleted: true }));
});
exports.getDeletedRecords = getDeletedRecords;
// Utility function to get all records (active and deleted)
const getAllRecords = (model_1, ...args_1) => __awaiter(void 0, [model_1, ...args_1], void 0, function* (model, query = {}) {
    return yield model.find(query);
});
exports.getAllRecords = getAllRecords;
// Utility function to permanently delete a record
const permanentDelete = (model, id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield model.findByIdAndDelete(id);
    if (!result) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Record not found");
    }
    return result;
});
exports.permanentDelete = permanentDelete;
