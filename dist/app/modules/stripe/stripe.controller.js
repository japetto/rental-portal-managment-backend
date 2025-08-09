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
exports.deleteStripeAccount = exports.getAllStripeAccounts = exports.getDefaultAccount = exports.setDefaultAccount = exports.unlinkPropertiesFromAccount = exports.linkPropertiesToAccount = exports.createStripeAccount = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const stripe_service_1 = require("./stripe.service");
// Create a new Stripe account for a property
exports.createStripeAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, stripeSecretKey, isDefaultAccount = false, metadata, } = req.body;
    // Prepare account data with proper defaults
    const accountData = {
        name,
        description: description || undefined,
        stripeSecretKey,
        isDefaultAccount: Boolean(isDefaultAccount),
        propertyIds: [], // Start with empty property array
        metadata: metadata || undefined,
    };
    try {
        const stripeAccount = yield (0, stripe_service_1.createStripeAccount)(accountData);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.CREATED,
            success: true,
            message: stripeAccount.message ||
                "Stripe account created, verified, and webhook configured",
            data: stripeAccount,
        });
    }
    catch (error) {
        if (error.message === "Stripe account with this name already exists") {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.CONFLICT,
                success: false,
                message: error.message,
                data: null,
            });
        }
        if (error.message ===
            "Stripe secret key is already in use by another account") {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.CONFLICT,
                success: false,
                message: error.message,
                data: null,
            });
        }
        if (error.message === "Another account is already set as default") {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.CONFLICT,
                success: false,
                message: error.message,
                data: null,
            });
        }
        if (error.message === "Duplicate account entry") {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.CONFLICT,
                success: false,
                message: "Account with these details already exists",
                data: null,
            });
        }
        if (error.message &&
            error.message.includes("Account verification failed")) {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.BAD_REQUEST,
                success: false,
                message: error.message,
                data: null,
            });
        }
        throw error;
    }
}));
// Link multiple properties to a Stripe account
exports.linkPropertiesToAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId, propertyIds } = req.body;
    try {
        const updatedAccount = yield (0, stripe_service_1.linkPropertiesToAccount)(accountId, propertyIds);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Properties linked to Stripe account successfully",
            data: updatedAccount,
        });
    }
    catch (error) {
        if (error.message === "Stripe account not found") {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.NOT_FOUND,
                success: false,
                message: error.message,
                data: null,
            });
        }
        if (error.message.includes("One or more properties not found")) {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.NOT_FOUND,
                success: false,
                message: error.message,
                data: null,
            });
        }
        if (error.message.includes("already assigned to other accounts")) {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.CONFLICT,
                success: false,
                message: error.message,
                data: null,
            });
        }
        throw error;
    }
}));
// Unlink properties from a Stripe account
exports.unlinkPropertiesFromAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId, propertyIds } = req.body;
    try {
        const updatedAccount = yield (0, stripe_service_1.unlinkPropertiesFromAccount)(accountId, propertyIds);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Properties unlinked from Stripe account successfully",
            data: updatedAccount,
        });
    }
    catch (error) {
        if (error.message === "Stripe account not found") {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.NOT_FOUND,
                success: false,
                message: error.message,
                data: null,
            });
        }
        throw error;
    }
}));
// Set an account as default
exports.setDefaultAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.body;
    try {
        const updatedAccount = yield (0, stripe_service_1.setDefaultAccount)(accountId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Default account set successfully",
            data: updatedAccount,
        });
    }
    catch (error) {
        if (error.message === "Stripe account not found") {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.NOT_FOUND,
                success: false,
                message: error.message,
                data: null,
            });
        }
        throw error;
    }
}));
// Get default account
exports.getDefaultAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const defaultAccount = yield (0, stripe_service_1.getDefaultAccount)();
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Default account retrieved successfully",
            data: defaultAccount,
        });
    }
    catch (error) {
        if (error.message === "No default account found") {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.NOT_FOUND,
                success: false,
                message: error.message,
                data: null,
            });
        }
        throw error;
    }
}));
// Get all Stripe accounts with comprehensive property information
exports.getAllStripeAccounts = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const comprehensiveData = yield (0, stripe_service_1.getAllStripeAccounts)();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Stripe accounts and property assignments retrieved successfully",
        data: comprehensiveData,
    });
}));
// Delete Stripe account (permanent delete)
exports.deleteStripeAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    try {
        yield (0, stripe_service_1.deleteStripeAccount)(accountId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Stripe account deleted successfully",
            data: null,
        });
    }
    catch (error) {
        if (error.message === "Stripe account not found") {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.NOT_FOUND,
                success: false,
                message: error.message,
                data: null,
            });
        }
        throw error;
    }
}));
// Webhook handlers removed; handled in api/stripe-webhook.js
