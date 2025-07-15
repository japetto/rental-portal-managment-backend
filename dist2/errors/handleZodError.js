"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handleZodError = (error) => {
    const statusCode = 400;
    const errors = error.issues.map((issue) => ({
        path: issue.path[issue.path.length - 1],
        message: issue.message,
    }));
    return {
        statusCode: statusCode,
        message: "Zod Validation Error",
        errorMessages: errors,
    };
};
exports.default = handleZodError;
