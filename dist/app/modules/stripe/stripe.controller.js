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
exports.deleteWebhook = exports.updateWebhook = exports.getWebhook = exports.listWebhooks = exports.createWebhooksForAllAccounts = exports.createWebhook = exports.updateStripeAccountSecretKey = exports.getAccountStatistics = exports.webhookStatus = exports.syncPaymentHistory = exports.handleWebhook = exports.getTenantPaymentStatus = exports.getPaymentLinkDetails = exports.createPaymentWithLink = exports.getAssignablePropertiesForAccount = exports.getUnassignedProperties = exports.getAvailableStripeAccounts = exports.verifyStripeAccount = exports.deleteStripeAccount = exports.updateStripeAccount = exports.getStripeAccountsByProperty = exports.getStripeAccountById = exports.getAllStripeAccounts = exports.getDefaultAccount = exports.setDefaultAccount = exports.unlinkPropertiesFromAccount = exports.linkPropertiesToAccount = exports.createStripeAccount = void 0;
exports.handlePaymentSuccess = handlePaymentSuccess;
exports.handlePaymentFailure = handlePaymentFailure;
exports.handlePaymentCanceled = handlePaymentCanceled;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const payments_schema_1 = require("../payments/payments.schema");
const users_schema_1 = require("../users/users.schema");
const stripe_service_1 = require("./stripe.service");
// Create a new Stripe account for a property
exports.createStripeAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, stripeAccountId, stripeSecretKey, accountType = "STANDARD", isGlobalAccount = false, isDefaultAccount = false, metadata, } = req.body;
    // Prepare account data with proper defaults
    const accountData = {
        name,
        description: description || undefined,
        stripeAccountId,
        stripeSecretKey,
        accountType,
        isGlobalAccount: Boolean(isGlobalAccount),
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
        if (error.message === "Stripe account ID already exists") {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.CONFLICT,
                success: false,
                message: error.message,
                data: null,
            });
        }
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
// Get Stripe account by ID
exports.getStripeAccountById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    try {
        const account = yield (0, stripe_service_1.getStripeAccountById)(accountId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Stripe account retrieved successfully",
            data: account,
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
// Get Stripe accounts by property ID
exports.getStripeAccountsByProperty = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { propertyId } = req.params;
    const accounts = yield (0, stripe_service_1.getStripeAccountsByProperty)(propertyId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Stripe accounts retrieved successfully",
        data: accounts,
    });
}));
// Update Stripe account
exports.updateStripeAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    const updateData = req.body;
    try {
        const account = yield (0, stripe_service_1.updateStripeAccount)(accountId, updateData);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Stripe account updated successfully",
            data: account,
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
        if (error.message === "Another account is already set as default") {
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
// Delete Stripe account (soft delete)
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
// Verify Stripe account with Stripe API
exports.verifyStripeAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    try {
        const account = yield (0, stripe_service_1.verifyStripeAccount)(accountId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: account.message || "Stripe account verified successfully",
            data: account,
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
        if (error.message.includes("Account verification failed")) {
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
// Get available Stripe accounts for a property (including global and default)
exports.getAvailableStripeAccounts = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { propertyId } = req.params;
    try {
        const result = yield (0, stripe_service_1.getAvailableStripeAccounts)(propertyId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Available Stripe accounts retrieved successfully",
            data: result,
        });
    }
    catch (error) {
        if (error.message === "Property not found") {
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
// Get unassigned properties (properties not linked to any Stripe account)
exports.getUnassignedProperties = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const unassignedProperties = yield (0, stripe_service_1.getUnassignedProperties)();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Unassigned properties retrieved successfully",
        data: unassignedProperties,
    });
}));
// Get properties that can be assigned to a specific Stripe account
exports.getAssignablePropertiesForAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    try {
        const assignableProperties = yield (0, stripe_service_1.getAssignablePropertiesForAccount)(accountId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Assignable properties retrieved successfully",
            data: assignableProperties,
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
// Create a new payment with unique payment link - Enhanced for first-time payments
exports.createPaymentWithLink = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { tenantId, currentDate } = req.body;
    const result = yield (0, stripe_service_1.createPaymentWithLinkEnhanced)({
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
exports.getPaymentLinkDetails = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { paymentLinkId } = req.params;
    // Get the payment to find the associated Stripe account
    const { Payments } = yield Promise.resolve().then(() => __importStar(require("../payments/payments.schema")));
    const payment = yield Payments.findOne({
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
    const paymentLink = yield (0, stripe_service_1.getPaymentLinkDetails)(paymentLinkId, payment.stripeAccountId.stripeSecretKey);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Payment link details retrieved successfully",
        data: paymentLink,
    });
}));
// Get comprehensive tenant payment status with automatic payment creation
exports.getTenantPaymentStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { tenantId } = req.params;
    const result = yield (0, stripe_service_1.getTenantPaymentStatusEnhanced)({
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
exports.handleWebhook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers["stripe-signature"];
    try {
        let event;
        // Get the raw body for signature verification
        const payload = req.body;
        // For multi-account setup, we need to verify with the correct account's webhook secret
        // Since we don't know which account this is for, we'll try the default one first
        try {
            event = (0, stripe_service_1.constructWebhookEvent)(payload, sig);
        }
        catch (err) {
            console.error("Webhook signature verification failed:", err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }
        switch (event.type) {
            case "payment_intent.succeeded":
                yield handlePaymentSuccess(event.data.object);
                break;
            case "payment_intent.payment_failed":
                yield handlePaymentFailure(event.data.object);
                break;
            case "payment_intent.canceled":
                yield handlePaymentCanceled(event.data.object);
                break;
            case "payment_intent.processing":
                break;
            case "payment_intent.requires_action":
                break;
            case "charge.succeeded":
                break;
            case "charge.updated":
                break;
            default:
                break;
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error("Webhook error:", error);
        res.status(400).send(`Webhook Error: ${error.message || "Unknown error"}`);
    }
}));
function handlePaymentSuccess(paymentIntent) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("💰 Processing payment success webhook:", {
                paymentIntentId: paymentIntent.id,
                metadata: paymentIntent.metadata,
                amount: paymentIntent.amount,
                status: paymentIntent.status,
            });
            // Extract metadata from the unique payment link
            const metadata = paymentIntent.metadata;
            if (!metadata.tenantId || !metadata.receiptNumber) {
                console.error("❌ Missing required payment metadata:", metadata);
                throw new Error("Missing required payment metadata");
            }
            // Check if payment already exists to prevent duplicates
            const duplicatePayment = yield payments_schema_1.Payments.findOne({
                stripeTransactionId: paymentIntent.id,
            });
            if (duplicatePayment) {
                console.log("⚠️ Payment already processed, skipping...");
                return;
            }
            // Create new payment record with PAID status
            console.log("💾 Creating payment record with PAID status...");
            // Extract payment details from metadata
            const paymentData = {
                tenantId: metadata.tenantId,
                propertyId: metadata.propertyId,
                spotId: metadata.spotId,
                amount: paymentIntent.amount / 100, // Convert from cents
                type: metadata.paymentType || "RENT",
                status: "PAID",
                dueDate: new Date(metadata.dueDate),
                paidDate: new Date(paymentIntent.created * 1000),
                paymentMethod: "ONLINE",
                transactionId: paymentIntent.id,
                stripeTransactionId: paymentIntent.id,
                stripePaymentLinkId: metadata.paymentLinkId || paymentIntent.id,
                receiptNumber: metadata.receiptNumber,
                description: metadata.paymentDescription || "Rent Payment",
                totalAmount: paymentIntent.amount / 100,
                lateFeeAmount: parseInt(metadata.lateFeeAmount || "0"),
                createdBy: "SYSTEM",
            };
            console.log("📝 Creating payment with data:", paymentData);
            const newPayment = yield payments_schema_1.Payments.create(paymentData);
            if (newPayment) {
                console.log("✅ Payment created successfully:", {
                    id: newPayment._id,
                    status: newPayment.status,
                    amount: newPayment.amount,
                    paidDate: newPayment.paidDate,
                    transactionId: newPayment.transactionId,
                    receiptNumber: newPayment.receiptNumber,
                });
            }
            else {
                console.error("❌ Failed to create payment");
            }
        }
        catch (error) {
            console.error("Payment success handling error:", error);
            throw error;
        }
    });
}
function handlePaymentFailure(paymentIntent) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const metadata = paymentIntent.metadata;
            const receiptNumber = metadata.receiptNumber;
            if (receiptNumber) {
                // Update payment status to failed
                yield payments_schema_1.Payments.findOneAndUpdate({ receiptNumber }, { status: "CANCELLED" });
            }
        }
        catch (error) {
            console.error("Payment failure handling error:", error);
        }
    });
}
function handlePaymentCanceled(paymentIntent) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const metadata = paymentIntent.metadata;
            const receiptNumber = metadata.receiptNumber;
            if (receiptNumber) {
                // Update payment status to cancelled
                yield payments_schema_1.Payments.findOneAndUpdate({ receiptNumber }, { status: "CANCELLED" });
            }
        }
        catch (error) {
            console.error("Payment cancellation handling error:", error);
        }
    });
}
// Sync payment history for a user
exports.syncPaymentHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const user = yield users_schema_1.Users.findById(userId);
    if (!user) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.NOT_FOUND,
            success: false,
            message: "User not found",
            data: null,
        });
    }
    // Get user's active lease to find the property and Stripe account
    const { Leases } = yield Promise.resolve().then(() => __importStar(require("../leases/leases.schema")));
    const activeLease = yield Leases.findOne({
        tenantId: userId,
        leaseStatus: "ACTIVE",
        isDeleted: false,
    });
    if (!activeLease) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.NOT_FOUND,
            success: false,
            message: "No active lease found for user",
            data: null,
        });
    }
    // Get the Stripe account for this property
    const { StripeAccounts } = yield Promise.resolve().then(() => __importStar(require("./stripe-accounts.schema")));
    const stripeAccount = yield StripeAccounts.findOne({
        propertyIds: activeLease.propertyId,
        isActive: true,
        isVerified: true,
    }).select("+stripeSecretKey");
    if (!stripeAccount) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.NOT_FOUND,
            success: false,
            message: "No active Stripe account found for property",
            data: null,
        });
    }
    yield (0, stripe_service_1.syncStripePayments)(stripeAccount.stripeAccountId || "", userId, stripeAccount.stripeSecretKey);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Payment history synced successfully",
        data: null,
    });
}));
// Webhook status check endpoint
exports.webhookStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
// Get account statistics for debugging
exports.getAccountStatistics = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const statistics = yield (0, stripe_service_1.getAccountStatistics)();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Account statistics retrieved successfully",
        data: statistics,
    });
}));
// Update Stripe account secret key (for debugging)
exports.updateStripeAccountSecretKey = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    const { stripeSecretKey } = req.body;
    try {
        const updatedAccount = yield (0, stripe_service_1.updateStripeAccountSecretKey)(accountId, stripeSecretKey);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Stripe account secret key updated successfully",
            data: updatedAccount,
        });
    }
    catch (error) {
        if (error.message.includes("Stripe account not found")) {
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.NOT_FOUND,
                success: false,
                message: error.message,
                data: null,
            });
        }
        if (error.message.includes("Failed to update secret key")) {
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
// Create webhook for a specific Stripe account
exports.createWebhook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    const { webhookUrl } = req.body;
    if (!webhookUrl) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Webhook URL is required",
            data: null,
        });
    }
    const webhook = yield (0, stripe_service_1.createWebhookEndpoint)(accountId, webhookUrl);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Webhook created successfully",
        data: {
            id: webhook.id,
            url: webhook.url,
            status: webhook.status,
            enabled_events: webhook.enabled_events,
        },
    });
}));
// Create webhooks for all active accounts
exports.createWebhooksForAllAccounts = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { webhookUrl } = req.body;
    if (!webhookUrl) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "Webhook URL is required",
            data: null,
        });
    }
    const result = yield (0, stripe_service_1.createWebhooksByAccountType)(webhookUrl);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: `Webhooks created for ${result.successful}/${result.processedAccounts} ${result.accountTypeProcessed} accounts`,
        data: result,
    });
}));
// List webhooks for a Stripe account
exports.listWebhooks = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId } = req.params;
    const webhooks = yield (0, stripe_service_1.listWebhookEndpoints)(accountId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Webhooks retrieved successfully",
        data: webhooks,
    });
}));
// Get webhook details
exports.getWebhook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId, webhookId } = req.params;
    const webhook = yield (0, stripe_service_1.getWebhookEndpoint)(accountId, webhookId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Webhook details retrieved successfully",
        data: webhook,
    });
}));
// Update webhook
exports.updateWebhook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId, webhookId } = req.params;
    const updateData = req.body;
    const webhook = yield (0, stripe_service_1.updateWebhookEndpoint)(accountId, webhookId, updateData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Webhook updated successfully",
        data: {
            id: webhook.id,
            url: webhook.url,
            status: webhook.status,
            enabled_events: webhook.enabled_events,
        },
    });
}));
// Delete webhook
exports.deleteWebhook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountId, webhookId } = req.params;
    yield (0, stripe_service_1.deleteWebhookEndpoint)(accountId, webhookId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Webhook deleted successfully",
        data: null,
    });
}));
