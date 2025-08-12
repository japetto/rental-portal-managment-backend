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
exports.PaymentController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const payment_service_1 = require("./payment.service");
const payments_schema_1 = require("./payments.schema");
// Get payment data by Stripe session ID (more secure for payment success page)
const getReceiptBySessionId = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { session_id, accountId } = req.query;
    console.log("🚀 ~ accountId:", accountId);
    console.log("🚀 ~ session_id:", session_id);
    if (!session_id || typeof session_id !== "string") {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Session ID is required",
            data: null,
        });
    }
    try {
        const paymentData = yield payment_service_1.PaymentService.getReceiptBySessionId(session_id, accountId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Payment data retrieved successfully",
            data: paymentData,
        });
    }
    catch (error) {
        console.error("Error retrieving receipt by session ID:", error);
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.NOT_FOUND,
            success: false,
            message: error.message || "Payment not found",
            data: null,
        });
    }
}));
// Get payment link details
const getPaymentLinkDetails = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { paymentLinkId } = req.params;
    // Get the payment to find the associated Stripe account
    const payment = yield payments_schema_1.Payments.findOne({
        stripePaymentLinkId: paymentLinkId,
    }).populate("stripeAccountId");
    if (!payment) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.NOT_FOUND,
            success: false,
            message: "Payment link not found",
            data: null,
        });
    }
    const paymentLink = yield payment_service_1.PaymentService.getPaymentLinkDetails(paymentLinkId, payment.stripeAccountId.stripeSecretKey);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Payment link details retrieved successfully",
        data: paymentLink,
    });
}));
// Get comprehensive tenant payment status with automatic payment creation
const getTenantPaymentStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { tenantId } = req.params;
    const result = yield payment_service_1.PaymentService.getTenantPaymentStatusEnhanced({
        tenantId,
        createdBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || "SYSTEM",
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Tenant payment status retrieved successfully",
        data: result,
    });
}));
// Get user's payment history
const getPaymentHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!userId) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.UNAUTHORIZED,
            success: false,
            message: "User not authenticated",
            data: null,
        });
    }
    const result = yield payment_service_1.PaymentService.getPaymentHistory(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Payment history retrieved successfully",
        data: result,
    });
}));
// Get user's rent summary
const getRentSummary = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    if (!userId) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.UNAUTHORIZED,
            success: false,
            message: "User not authenticated",
            data: null,
        });
    }
    try {
        const result = yield payment_service_1.PaymentService.getRentSummary(userId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: result.hasActiveLease
                ? "Rent summary retrieved successfully"
                : "No active lease found",
            data: result,
        });
    }
    catch (error) {
        console.error("Error in getRentSummary controller:", error);
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.INTERNAL_SERVER_ERROR,
            success: false,
            message: "Error retrieving rent summary",
            data: {
                error: error.message,
                hasActiveLease: false,
            },
        });
    }
}));
// Create payment with link
const createPaymentWithLink = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { tenantId, currentDate } = req.body;
    const createdBy = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || "SYSTEM";
    try {
        const result = yield payment_service_1.PaymentService.createPaymentWithLink({
            tenantId,
            currentDate,
            createdBy,
        });
        // Check if this is a pending payment response
        if (result.hasPendingPayment) {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: result.message,
                data: {
                    hasPendingPayment: true,
                    pendingPayment: result.pendingPayment,
                    paymentLink: result.paymentLink,
                    amount: result.amount,
                    dueDate: result.dueDate,
                    description: result.description,
                    createdAt: result.createdAt,
                    paymentStatus: "PENDING",
                },
            });
        }
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Payment with link created successfully",
            data: {
                hasPendingPayment: false,
                paymentLink: result.paymentLink,
                amount: result.amount,
                dueDate: result.dueDate,
                description: result.description,
                isFirstTimePayment: result.isFirstTimePayment,
                includeDeposit: result.includeDeposit,
                warningMessage: result.warningMessage,
                lease: result.lease,
            },
        });
    }
    catch (error) {
        if (error.message.includes("You have already paid for the current month and next month")) {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.BAD_REQUEST,
                success: false,
                message: "Payment Limit Reached",
                data: {
                    error: error.message,
                    warning: error.message,
                    paymentStatus: "LIMIT_REACHED",
                },
            });
        }
        else if (error.message.includes("is overdue")) {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.BAD_REQUEST,
                success: false,
                message: "Overdue Payment",
                data: {
                    error: error.message,
                    paymentStatus: "OVERDUE",
                },
            });
        }
        else {
            throw error;
        }
    }
}));
// Add new controller method to verify payment link ownership
const verifyPaymentLink = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { paymentLinkId } = req.params;
    const tenantId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!tenantId) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.UNAUTHORIZED,
            success: false,
            message: "User not authenticated",
            data: {
                error: "Authentication required",
            },
        });
    }
    try {
        const verificationResult = yield payment_service_1.PaymentService.verifyPaymentLinkOwnership(paymentLinkId, tenantId);
        if (!verificationResult.isValid) {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.BAD_REQUEST,
                success: false,
                message: verificationResult.message,
                data: {
                    isValid: false,
                    message: verificationResult.message,
                },
            });
        }
        // Get detailed payment information
        const pendingPaymentDetails = yield payment_service_1.PaymentService.getPendingPaymentDetails(tenantId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Payment link is valid",
            data: {
                isValid: true,
                message: verificationResult.message,
                paymentRecord: verificationResult.paymentRecord,
                pendingPayment: pendingPaymentDetails,
            },
        });
    }
    catch (error) {
        console.error("Error verifying payment link:", error);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.INTERNAL_SERVER_ERROR,
            success: false,
            message: "Error verifying payment link",
            data: {
                error: error.message,
            },
        });
    }
}));
exports.PaymentController = {
    getReceiptBySessionId,
    getPaymentLinkDetails,
    getTenantPaymentStatus,
    getPaymentHistory,
    getRentSummary,
    createPaymentWithLink,
    verifyPaymentLink,
    // Admin: get specific tenant payment history
    getTenantPaymentHistory: (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { tenantId } = req.params;
        const result = yield payment_service_1.PaymentService.getPaymentHistory(tenantId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Tenant payment history retrieved successfully",
            data: result,
        });
    })),
};
