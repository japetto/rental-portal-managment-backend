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
// Get payment data by receipt number (for payment success page)
const getPaymentByReceipt = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { receiptNumber } = req.params;
    const payment = yield payments_schema_1.Payments.findOne({
        receiptNumber,
        isDeleted: false,
    }).populate([
        {
            path: "tenantId",
            select: "name email phone",
        },
        {
            path: "propertyId",
            select: "name address propertyType lotNumber unitNumber",
        },
        {
            path: "spotId",
            select: "spotNumber spotType",
        },
        {
            path: "stripeAccountId",
            select: "name stripeAccountId",
        },
    ]);
    if (!payment) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.NOT_FOUND,
            success: false,
            message: "Payment not found",
            data: null,
        });
    }
    // Format the payment data for the frontend
    const paymentData = {
        id: payment._id,
        receiptNumber: payment.receiptNumber,
        amount: payment.amount,
        totalAmount: payment.totalAmount,
        lateFeeAmount: payment.lateFeeAmount,
        type: payment.type,
        status: payment.status,
        dueDate: payment.dueDate,
        paidDate: payment.paidDate,
        description: payment.description,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        stripeTransactionId: payment.stripeTransactionId,
        stripePaymentLinkId: payment.stripePaymentLinkId,
        // Tenant information
        tenant: {
            id: payment.tenantId._id,
            name: payment.tenantId.name,
            email: payment.tenantId.email,
            phone: payment.tenantId.phone,
        },
        // Property information
        property: {
            id: payment.propertyId._id,
            name: payment.propertyId.name,
            address: payment.propertyId.address,
            propertyType: payment.propertyId.propertyType,
            lotNumber: payment.propertyId.lotNumber,
            unitNumber: payment.propertyId.unitNumber,
        },
        // Parking spot information
        spot: payment.spotId
            ? {
                id: payment.spotId._id,
                spotNumber: payment.spotId.spotNumber,
                spotType: payment.spotId.spotType,
            }
            : null,
        // Stripe account information
        stripeAccount: payment.stripeAccountId
            ? {
                id: payment.stripeAccountId._id,
                name: payment.stripeAccountId.name,
                stripeAccountId: payment.stripeAccountId.stripeAccountId,
            }
            : null,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
    };
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Payment data retrieved successfully",
        data: paymentData,
    });
}));
// Create a new payment with unique payment link - Enhanced for first-time payments
const createPaymentWithLink = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { tenantId, currentDate } = req.body;
    const result = yield (0, payment_service_1.createPaymentWithLinkEnhanced)({
        tenantId,
        currentDate,
        createdBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || "SYSTEM",
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: result.isFirstTimePayment
            ? "First-time rent payment link created successfully"
            : "Rent payment link created successfully",
        data: {
            paymentLink: {
                id: result.paymentLink.id,
                url: result.paymentLink.url,
            },
            receiptNumber: result.receiptNumber,
            lease: result.lease,
            paymentInfo: result.paymentInfo,
        },
    });
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
    const paymentLink = yield (0, payment_service_1.getPaymentLinkDetails)(paymentLinkId, payment.stripeAccountId.stripeSecretKey);
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
    const result = yield (0, payment_service_1.getTenantPaymentStatusEnhanced)({
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
    const result = yield (0, payment_service_1.getPaymentHistory)(userId);
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
    const result = yield (0, payment_service_1.getRentSummary)(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: result.hasActiveLease
            ? "Rent summary retrieved successfully"
            : "No active lease found",
        data: result,
    });
}));
// Create payment link for a specific payment
const createPaymentLink = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
    const { paymentId } = req.params;
    if (!userId) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.UNAUTHORIZED,
            success: false,
            message: "User not authenticated",
            data: null,
        });
    }
    // Find the payment and verify it belongs to the user
    const payment = yield payments_schema_1.Payments.findOne({
        _id: paymentId,
        tenantId: userId,
        status: { $in: ["PENDING", "OVERDUE"] },
        isDeleted: false,
    });
    if (!payment) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.NOT_FOUND,
            success: false,
            message: "Payment not found or not eligible for payment",
            data: null,
        });
    }
    try {
        const paymentLink = yield (0, payment_service_1.createPaymentLink)({
            tenantId: payment.tenantId.toString(),
            propertyId: payment.propertyId.toString(),
            spotId: payment.spotId.toString(),
            amount: payment.amount,
            type: payment.type,
            dueDate: payment.dueDate,
            description: payment.description,
            lateFeeAmount: payment.lateFeeAmount,
            receiptNumber: payment.receiptNumber,
        });
        // Update payment record with the new payment link
        yield payments_schema_1.Payments.findByIdAndUpdate(payment._id, {
            stripePaymentLinkId: paymentLink.id,
        });
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Payment link created successfully",
            data: {
                paymentId: payment._id,
                paymentLink: {
                    id: paymentLink.id,
                    url: paymentLink.url,
                },
            },
        });
    }
    catch (error) {
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.INTERNAL_SERVER_ERROR,
            success: false,
            message: "Failed to create payment link",
            data: null,
        });
    }
}));
exports.PaymentController = {
    getPaymentByReceipt,
    createPaymentWithLink,
    getPaymentLinkDetails,
    getTenantPaymentStatus,
    getPaymentHistory,
    getRentSummary,
    createPaymentLink,
};
