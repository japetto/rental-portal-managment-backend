"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../config/config"));
const handleValidationError_1 = __importDefault(require("../errors/handleValidationError"));
const zod_1 = require("zod");
const handleZodError_1 = __importDefault(require("../errors/handleZodError"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const handleCastError_1 = __importDefault(require("../errors/handleCastError"));
const handleDuplicationError_1 = __importDefault(require("../errors/handleDuplicationError"));
const globalErrorHandler = (error, req, res, next) => {
    config_1.default.node_env === "development"
        ? console.log(`GlobalErrorHandler~~`, error)
        : console.error(`GlobalErrorHandler~~`, error);
    let statusCode = 500;
    let message = "Internal Server Error!";
    let errorMessages = [];
    if ((error === null || error === void 0 ? void 0 : error.name) === "ValidationError") {
        const simplifiedError = (0, handleValidationError_1.default)(error);
        statusCode = simplifiedError.statusCode;
        message = simplifiedError.message;
        errorMessages = simplifiedError.errorMessages;
    } //
    else if ((error === null || error === void 0 ? void 0 : error.name) === "MongoServerError") {
        const simplifiedError = (0, handleDuplicationError_1.default)(error);
        statusCode = simplifiedError === null || simplifiedError === void 0 ? void 0 : simplifiedError.statusCode;
        message = simplifiedError === null || simplifiedError === void 0 ? void 0 : simplifiedError.message;
        errorMessages = simplifiedError === null || simplifiedError === void 0 ? void 0 : simplifiedError.errorMessages;
    } //
    else if (error instanceof zod_1.ZodError) {
        const simplifiedError = (0, handleZodError_1.default)(error);
        statusCode = simplifiedError.statusCode;
        message = simplifiedError.message;
        errorMessages = simplifiedError.errorMessages;
    } //
    else if ((error === null || error === void 0 ? void 0 : error.name) === "CastError") {
        const simplifiedError = (0, handleCastError_1.default)(error);
        statusCode = simplifiedError === null || simplifiedError === void 0 ? void 0 : simplifiedError.statusCode;
        message = simplifiedError === null || simplifiedError === void 0 ? void 0 : simplifiedError.message;
        errorMessages = simplifiedError === null || simplifiedError === void 0 ? void 0 : simplifiedError.errorMessages;
    } //
    else if (error instanceof ApiError_1.default) {
        statusCode = error === null || error === void 0 ? void 0 : error.statusCode;
        message = error === null || error === void 0 ? void 0 : error.message;
        errorMessages = (error === null || error === void 0 ? void 0 : error.message)
            ? [
                {
                    path: "",
                    message: error === null || error === void 0 ? void 0 : error.message,
                },
            ]
            : [];
    } //
    else if (error instanceof Error) {
        message = error === null || error === void 0 ? void 0 : error.message;
        errorMessages = (error === null || error === void 0 ? void 0 : error.message)
            ? [
                {
                    path: "",
                    message: error === null || error === void 0 ? void 0 : error.message,
                },
            ]
            : [];
    }
    res.status(statusCode).send({
        success: false,
        statusCode,
        message,
        errorMessages,
        stack: config_1.default.node_env === "production" ? undefined : error === null || error === void 0 ? void 0 : error.stack,
    });
};
exports.default = globalErrorHandler;
