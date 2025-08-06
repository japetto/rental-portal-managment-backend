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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = exports.deleteStripeAccount = exports.getAllStripeAccounts = exports.getDefaultAccount = exports.setDefaultAccount = exports.unlinkPropertiesFromAccount = exports.linkPropertiesToAccount = exports.createStripeAccount = void 0;
exports.handlePaymentSuccess = handlePaymentSuccess;
exports.handlePaymentFailure = handlePaymentFailure;
exports.handlePaymentCanceled = handlePaymentCanceled;
const http_status_1 = __importDefault(require("http-status"));
const stripe_1 = __importDefault(require("stripe"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const payments_schema_1 = require("../payments/payments.schema");
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
function handlePaymentSuccess(paymentIntent, accountId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("💰 Processing payment success webhook:", {
                paymentIntentId: paymentIntent.id,
                metadata: paymentIntent.metadata,
                amount: paymentIntent.amount,
                status: paymentIntent.status,
                accountId,
            });
            // Extract metadata from the payment intent
            const metadata = paymentIntent.metadata;
            if (!metadata.tenantId || !metadata.receiptNumber) {
                console.error("❌ Missing required payment metadata:", metadata);
                throw new Error("Missing required payment metadata");
            }
            // Find existing payment record by receipt number
            const existingPayment = yield payments_schema_1.Payments.findOne({
                receiptNumber: metadata.receiptNumber,
            });
            if (!existingPayment) {
                console.error("❌ No payment record found for receipt:", metadata.receiptNumber);
                return;
            }
            // Check if payment already processed to prevent duplicates
            if (existingPayment.status === "PAID") {
                console.log("⚠️ Payment already processed, skipping...");
                return;
            }
            // Update existing payment record with PAID status
            console.log("💾 Updating payment record with PAID status...");
            const updatedPayment = yield payments_schema_1.Payments.findByIdAndUpdate(existingPayment._id, {
                status: "PAID",
                paidDate: new Date(paymentIntent.created * 1000),
                paymentMethod: "ONLINE",
                transactionId: paymentIntent.id,
                stripeTransactionId: paymentIntent.id,
                stripePaymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount / 100, // Update with actual amount paid
                totalAmount: paymentIntent.amount / 100,
                stripeAccountId: accountId, // Store which Stripe account processed this
            }, { new: true });
            if (updatedPayment) {
                console.log("✅ Payment updated successfully:", {
                    id: updatedPayment._id,
                    status: updatedPayment.status,
                    amount: updatedPayment.amount,
                    paidDate: updatedPayment.paidDate,
                    transactionId: updatedPayment.transactionId,
                    receiptNumber: updatedPayment.receiptNumber,
                    stripeAccountId: updatedPayment.stripeAccountId,
                });
            }
            else {
                console.error("❌ Failed to update payment");
            }
        }
        catch (error) {
            console.error("Payment success handling error:", error);
            throw error;
        }
    });
}
function handlePaymentFailure(paymentIntent, accountId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const metadata = paymentIntent.metadata;
            const receiptNumber = metadata.receiptNumber;
            if (receiptNumber) {
                // Update payment status to failed
                yield payments_schema_1.Payments.findOneAndUpdate({ receiptNumber }, {
                    status: "CANCELLED",
                    stripeAccountId: accountId,
                });
            }
        }
        catch (error) {
            console.error("Payment failure handling error:", error);
        }
    });
}
function handlePaymentCanceled(paymentIntent, accountId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const metadata = paymentIntent.metadata;
            const receiptNumber = metadata.receiptNumber;
            if (receiptNumber) {
                // Update payment status to cancelled
                yield payments_schema_1.Payments.findOneAndUpdate({ receiptNumber }, {
                    status: "CANCELLED",
                    stripeAccountId: accountId,
                });
            }
        }
        catch (error) {
            console.error("Payment cancellation handling error:", error);
        }
    });
}
exports.handleWebhook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers["stripe-signature"];
    console.log("🔔 Webhook received:", {
        method: req.method,
        path: req.path,
        headers: {
            "stripe-signature": sig ? "present" : "missing",
            "content-type": req.headers["content-type"],
            "user-agent": req.headers["user-agent"],
        },
        bodySize: req.body ? JSON.stringify(req.body).length : 0,
    });
    try {
        let event;
        let accountId;
        // Get the raw body for signature verification
        const payload = req.body;
        // Try to verify with account-specific webhook secrets first
        try {
            const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("./stripe.schema")));
            const accounts = yield StripeAccounts.find({
                isActive: true,
                webhookStatus: "ACTIVE",
            }).select("+stripeSecretKey +webhookSecret");
            console.log(`🔍 Found ${accounts.length} active Stripe accounts to try`);
            for (const account of accounts) {
                if (account.stripeSecretKey && account.webhookSecret) {
                    try {
                        const stripe = new stripe_1.default(account.stripeSecretKey, {
                            apiVersion: "2025-06-30.basil",
                        });
                        event = stripe.webhooks.constructEvent(payload, sig, account.webhookSecret);
                        console.log(`✅ Webhook verified with account: ${account.name}`);
                        accountId = account._id.toString();
                        break;
                    }
                    catch (accountErr) {
                        console.log(`❌ Webhook verification failed for account ${account.name}: ${accountErr.message}`);
                    }
                }
            }
        }
        catch (importErr) {
            console.error("Error importing StripeAccounts schema:", importErr.message);
        }
        // If account-specific verification failed, try with default webhook secret
        if (!event) {
            try {
                event = (0, stripe_service_1.constructWebhookEvent)(payload, sig);
                console.log("✅ Webhook verified with default secret");
            }
            catch (err) {
                console.error("Webhook signature verification failed:", err.message);
                res.status(400).send(`Webhook Error: Signature verification failed`);
                return;
            }
        }
        console.log("🔔 Processing webhook event:", {
            type: event.type,
            id: event.id,
            created: event.created,
            accountId,
            data: {
                object: event.data.object.id,
                objectType: event.data.object.object,
            },
        });
        switch (event.type) {
            case "payment_intent.succeeded":
                yield handlePaymentSuccess(event.data.object, accountId);
                break;
            case "payment_intent.payment_failed":
                yield handlePaymentFailure(event.data.object, accountId);
                break;
            case "payment_intent.canceled":
                yield handlePaymentCanceled(event.data.object, accountId);
                break;
            case "payment_intent.processing":
                console.log("Payment processing...");
                break;
            case "payment_intent.requires_action":
                console.log("Payment requires action...");
                break;
            case "charge.succeeded":
                console.log("Charge succeeded...");
                break;
            case "charge.updated":
                console.log("Charge updated...");
                break;
            default:
                console.log(`Unhandled webhook event type: ${event.type}`);
                break;
        }
        console.log("✅ Webhook processed successfully");
        res.json({ received: true });
    }
    catch (error) {
        console.error("Webhook error:", error);
        res.status(400).send(`Webhook Error: ${error.message || "Unknown error"}`);
    }
}));
