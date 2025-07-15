"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handleCastError = (error) => {
    const statusCode = 400;
    const errors = [
        {
            path: error === null || error === void 0 ? void 0 : error.path,
            message: `Invalid _id: '${error.value}' Detected!`,
        },
    ];
    return {
        statusCode: statusCode,
        message: error.name,
        errorMessages: errors,
    };
};
exports.default = handleCastError;
