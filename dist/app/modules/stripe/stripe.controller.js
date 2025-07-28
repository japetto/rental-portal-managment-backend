"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const properties_schema_1 = require("../properties/properties.schema");
const users_schema_1 = require("../users/users.schema");
const stripe_service_1 = require("./stripe.service");
class StripeController {
    static handlePaymentSuccess(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _b, _c;
            const timestamp = new Date().toISOString();
            try {
                console.log(`💰 [${timestamp}] Payment Intent Data:`, {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    amount_formatted: `$${(paymentIntent.amount / 100).toFixed(2)}`,
                    metadata: paymentIntent.metadata,
                    customer: paymentIntent.customer,
                    created: new Date(paymentIntent.created * 1000).toISOString(),
                    status: paymentIntent.status,
                    currency: paymentIntent.currency,
                });
                let user = null;
                let lookupMethod = "";
                // Find user by payment link ID in metadata
                if ((_b = paymentIntent.metadata) === null || _b === void 0 ? void 0 : _b.paymentLinkId) {
                    lookupMethod = "metadata.paymentLinkId";
                    console.log(`🔍 [${timestamp}] Looking for user with paymentLinkId:`, paymentIntent.metadata.paymentLinkId);
                    user = yield users_schema_1.Users.findOne({
                        stripePaymentLinkId: paymentIntent.metadata.paymentLinkId,
                    });
                    console.log(`🔍 [${timestamp}] User found by ${lookupMethod}:`, user ? `Yes (${user._id})` : "No");
                }
                // If not found, try to find by payment link ID from the payment intent
                if (!user && paymentIntent.payment_link) {
                    lookupMethod = "payment_link";
                    console.log(`🔍 [${timestamp}] Looking for user with payment_link:`, paymentIntent.payment_link);
                    user = yield users_schema_1.Users.findOne({
                        stripePaymentLinkId: paymentIntent.payment_link,
                    });
                    console.log(`🔍 [${timestamp}] User found by ${lookupMethod}:`, user ? `Yes (${user._id})` : "No");
                }
                // If still not found, try to find by customer ID
                if (!user && paymentIntent.customer) {
                    lookupMethod = "customer";
                    console.log(`🔍 [${timestamp}] Looking for user with customerId:`, paymentIntent.customer);
                    user = yield users_schema_1.Users.findOne({
                        stripeCustomerId: paymentIntent.customer,
                    });
                    console.log(`🔍 [${timestamp}] User found by ${lookupMethod}:`, user ? `Yes (${user._id})` : "No");
                }
                if (!user) {
                    console.error(`❌ [${timestamp}] User not found for payment. Available data:`, {
                        metadata: paymentIntent.metadata,
                        customer: paymentIntent.customer,
                        payment_link: paymentIntent.payment_link,
                    });
                    throw new Error("User not found for payment");
                }
                console.log(`✅ [${timestamp}] User found: ${user._id} (via ${lookupMethod})`);
                // Check if payment already exists
                const existingPayment = yield payments_schema_1.Payments.findOne({
                    stripeTransactionId: paymentIntent.id,
                });
                if (existingPayment) {
                    console.log(`⚠️ [${timestamp}] Payment already exists: ${paymentIntent.id}`);
                    return;
                }
                // Get user details
                const userDoc = yield users_schema_1.Users.findById(user._id);
                if (!userDoc)
                    throw new Error("User not found");
                console.log(`👤 [${timestamp}] User details:`, {
                    userId: userDoc._id,
                    propertyId: userDoc.propertyId,
                    spotId: userDoc.spotId,
                    stripePaymentLinkId: userDoc.stripePaymentLinkId,
                });
                // Find property by name from metadata or use user's assigned property
                let property = null;
                if ((_c = paymentIntent.metadata) === null || _c === void 0 ? void 0 : _c.propertyName) {
                    console.log(`🏠 [${timestamp}] Looking for property by name:`, paymentIntent.metadata.propertyName);
                    property = yield properties_schema_1.Properties.findOne({
                        name: paymentIntent.metadata.propertyName,
                    });
                }
                if (!property) {
                    console.log(`🏠 [${timestamp}] Looking for property by ID:`, userDoc.propertyId);
                    property = yield properties_schema_1.Properties.findById(userDoc.propertyId);
                }
                if (!property) {
                    console.error(`❌ [${timestamp}] Property not found for payment`);
                    throw new Error("Property not found for payment");
                }
                console.log(`✅ [${timestamp}] Property found: ${property._id} (${property.name})`);
                // Get lease details for validation
                const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
                const lease = yield Leases.findOne({
                    tenantId: user._id,
                    leaseStatus: "ACTIVE",
                    isDeleted: false,
                });
                console.log(`📋 [${timestamp}] Lease found:`, lease ? `Yes (${lease._id})` : "No");
                // Create payment record
                const paymentData = {
                    tenantId: user._id,
                    propertyId: property._id,
                    spotId: userDoc.spotId,
                    amount: paymentIntent.amount / 100, // Convert from cents
                    type: "RENT",
                    status: "PAID",
                    dueDate: (lease === null || lease === void 0 ? void 0 : lease.leaseStart) || new Date(),
                    paidDate: new Date(paymentIntent.created * 1000),
                    paymentMethod: "ONLINE",
                    transactionId: paymentIntent.id,
                    stripeTransactionId: paymentIntent.id,
                    stripePaymentLinkId: userDoc.stripePaymentLinkId,
                    receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    description: "Monthly Rent Payment",
                    totalAmount: paymentIntent.amount / 100,
                    createdBy: "SYSTEM",
                };
                console.log(`💾 [${timestamp}] Creating payment record:`, {
                    amount: paymentData.amount,
                    dueDate: paymentData.dueDate,
                    transactionId: paymentData.transactionId,
                });
                const payment = yield payments_schema_1.Payments.create(paymentData);
                console.log(`✅ [${timestamp}] Payment successful for user ${user._id}: ${paymentIntent.id}`);
                console.log(`✅ [${timestamp}] Created payment record: ${payment._id}`);
                console.log(`💰 [${timestamp}] Amount: $${paymentData.amount.toFixed(2)}`);
            }
            catch (error) {
                console.error(`💥 [${timestamp}] Payment success handling error:`, error);
                throw error;
            }
        });
    }
    static handlePaymentFailure(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _b;
            try {
                // Find user by payment link ID in metadata
                let user = null;
                if ((_b = paymentIntent.metadata) === null || _b === void 0 ? void 0 : _b.paymentLinkId) {
                    user = yield users_schema_1.Users.findOne({
                        stripePaymentLinkId: paymentIntent.metadata.paymentLinkId,
                    });
                }
                // If not found, try to find by customer ID
                if (!user && paymentIntent.customer) {
                    user = yield users_schema_1.Users.findOne({
                        stripeCustomerId: paymentIntent.customer,
                    });
                }
                if (user) {
                    console.log(`Payment failed for user: ${user._id}`);
                    // Add notification logic here if needed
                }
            }
            catch (error) {
                console.error("Payment failure handling error:", error);
            }
        });
    }
    static handlePaymentCanceled(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _b;
            try {
                // Find user by payment link ID in metadata
                let user = null;
                if ((_b = paymentIntent.metadata) === null || _b === void 0 ? void 0 : _b.paymentLinkId) {
                    user = yield users_schema_1.Users.findOne({
                        stripePaymentLinkId: paymentIntent.metadata.paymentLinkId,
                    });
                }
                // If not found, try to find by customer ID
                if (!user && paymentIntent.customer) {
                    user = yield users_schema_1.Users.findOne({
                        stripeCustomerId: paymentIntent.customer,
                    });
                }
                if (user) {
                    console.log(`Payment canceled for user: ${user._id}`);
                    // Add cancellation logic here if needed
                }
            }
            catch (error) {
                console.error("Payment cancellation handling error:", error);
            }
        });
    }
}
exports.StripeController = StripeController;
_a = StripeController;
StripeController.handleWebhook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers["stripe-signature"];
    const timestamp = new Date().toISOString();
    console.log(`🔔 [${timestamp}] Webhook received`);
    console.log(`📋 Headers:`, {
        "stripe-signature": sig ? "present" : "missing",
        "content-type": req.headers["content-type"],
        "user-agent": req.headers["user-agent"],
    });
    try {
        let event;
        // Get the raw body for signature verification
        const payload = req.body;
        console.log(`📦 Payload type: ${typeof payload}, length: ${(payload === null || payload === void 0 ? void 0 : payload.length) || 0}`);
        // Verify the signature
        try {
            event = stripe_service_1.StripeService.constructWebhookEvent(payload, sig);
            console.log(`✅ Signature verification successful`);
        }
        catch (err) {
            console.error(`❌ [${timestamp}] Webhook signature verification failed:`, err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }
        console.log(`📨 [${timestamp}] Received webhook event: ${event.type}`);
        console.log(`🆔 Event ID: ${event.id}`);
        switch (event.type) {
            case "payment_intent.succeeded":
                console.log(`💰 [${timestamp}] Processing payment_intent.succeeded`);
                yield _a.handlePaymentSuccess(event.data.object);
                break;
            case "payment_intent.payment_failed":
                console.log(`❌ [${timestamp}] Processing payment_intent.payment_failed`);
                yield _a.handlePaymentFailure(event.data.object);
                break;
            case "payment_intent.canceled":
                console.log(`🚫 [${timestamp}] Processing payment_intent.canceled`);
                yield _a.handlePaymentCanceled(event.data.object);
                break;
            case "payment_intent.processing":
                console.log(`⏳ [${timestamp}] Payment processing: ${event.data.object.id}`);
                break;
            case "payment_intent.requires_action":
                console.log(`⚠️ [${timestamp}] Payment requires action: ${event.data.object.id}`);
                break;
            case "charge.succeeded":
                console.log(`💳 [${timestamp}] Charge succeeded: ${event.data.object.id}`);
                break;
            case "charge.updated":
                console.log(`🔄 [${timestamp}] Charge updated: ${event.data.object.id}`);
                break;
            default:
                console.log(`❓ [${timestamp}] Unhandled event type: ${event.type}`);
        }
        console.log(`✅ [${timestamp}] Webhook processed successfully`);
        res.json({ received: true });
    }
    catch (error) {
        console.error(`💥 [${timestamp}] Webhook error:`, error);
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
// Webhook status check endpoint
StripeController.webhookStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const timestamp = new Date().toISOString();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Webhook endpoint is active",
        data: {
            timestamp,
            status: "active",
            endpoint: "/api/v1.0/webhooks/webhook",
            environment: process.env.NODE_ENV || "development",
        },
    });
}));
