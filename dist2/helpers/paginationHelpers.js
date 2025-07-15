"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePaginationFunction = void 0;
const calculatePaginationFunction = (options) => {
    const page = Number(options.page || 1);
    const limit = Number(options.limit || 10);
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder || "desc";
    return {
        page,
        limit,
        skip,
        sortBy,
        sortOrder,
    };
};
exports.calculatePaginationFunction = calculatePaginationFunction;
