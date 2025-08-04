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
exports.PaymentController = {
    getPaymentByReceipt,
};
