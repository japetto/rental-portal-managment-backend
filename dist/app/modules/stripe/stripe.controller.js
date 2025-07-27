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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const payments_schema_1 = require("../payments/payments.schema");
const users_schema_1 = require("../users/users.schema");
const stripe_service_1 = require("./stripe.service");
class StripeController {
    static handlePaymentSuccess(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            const stripeService = new stripe_service_1.StripeService();
            try {
                // Find user by payment link - use metadata or other identifier
                const user = yield users_schema_1.Users.findOne({
                    stripePaymentLinkId: paymentIntent.payment_link || paymentIntent.id,
                });
                if (!user) {
                    throw new Error("User not found for payment link");
                }
                // Create payment record with error handling
                yield stripeService.createPaymentFromStripe(paymentIntent, user._id.toString());
                console.log(`Payment successful for user ${user._id.toString()}: ${paymentIntent.id}`);
            }
            catch (error) {
                console.error("Payment success handling error:", error);
                // If property not found, cancel payment
                if (error.message && error.message.includes("Property not found")) {
                    yield stripeService.cancelPaymentIntent(paymentIntent.id);
                }
                throw error;
            }
        });
    }
    static handlePaymentFailure(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Payment failed:", paymentIntent.id);
            // Find user by payment link - use metadata or other identifier
            const user = yield users_schema_1.Users.findOne({
                stripePaymentLinkId: paymentIntent.payment_link || paymentIntent.id,
            });
            if (user) {
                // Create failed payment record
                yield payments_schema_1.Payments.create({
                    tenantId: user._id,
                    propertyId: user.propertyId,
                    spotId: user.spotId,
                    amount: paymentIntent.amount / 100,
                    type: "RENT",
                    status: "CANCELLED",
                    dueDate: new Date(),
                    paymentMethod: "ONLINE",
                    transactionId: paymentIntent.id,
                    stripeTransactionId: paymentIntent.id,
                    stripePaymentLinkId: user.stripePaymentLinkId,
                    receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    description: "Monthly Rent Payment - Failed",
                    totalAmount: paymentIntent.amount / 100,
                    createdBy: "SYSTEM",
                });
            }
        });
    }
    static handlePaymentCanceled(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Payment canceled:", paymentIntent.id);
            // Find user by payment link - use metadata or other identifier
            const user = yield users_schema_1.Users.findOne({
                stripePaymentLinkId: paymentIntent.payment_link || paymentIntent.id,
            });
            if (user) {
                // Create canceled payment record
                yield payments_schema_1.Payments.create({
                    tenantId: user._id,
                    propertyId: user.propertyId,
                    spotId: user.spotId,
                    amount: paymentIntent.amount / 100,
                    type: "RENT",
                    status: "CANCELLED",
                    dueDate: new Date(),
                    paymentMethod: "ONLINE",
                    transactionId: paymentIntent.id,
                    stripeTransactionId: paymentIntent.id,
                    stripePaymentLinkId: user.stripePaymentLinkId,
                    receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    description: "Monthly Rent Payment - Canceled",
                    totalAmount: paymentIntent.amount / 100,
                    createdBy: "SYSTEM",
                });
            }
        });
    }
}
exports.StripeController = StripeController;
_a = StripeController;
StripeController.handleWebhook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers["stripe-signature"];
    try {
        const event = stripe_service_1.StripeService.constructWebhookEvent(req.body, sig);
        switch (event.type) {
            case "payment_intent.succeeded":
                yield _a.handlePaymentSuccess(event.data.object);
                break;
            case "payment_intent.payment_failed":
                yield _a.handlePaymentFailure(event.data.object);
                break;
            case "payment_intent.canceled":
                yield _a.handlePaymentCanceled(event.data.object);
                break;
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error("Webhook error:", error);
        res
            .status(400)
            .send(`Webhook Error: ${error.message || "Unknown error"}`);
    }
}));
// Sync payment history for a user
StripeController.syncPaymentHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const user = yield users_schema_1.Users.findById(userId);
    if (!user || !user.stripePaymentLinkId) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.NOT_FOUND,
            success: false,
            message: "User or payment link not found",
            data: null,
        });
    }
    const stripeService = new stripe_service_1.StripeService();
    yield stripeService.syncStripePayments(user.stripePaymentLinkId, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Payment history synced successfully",
        data: null,
    });
}));
