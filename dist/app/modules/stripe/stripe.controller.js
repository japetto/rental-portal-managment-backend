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
exports.handleStripeWebhook = exports.handleStripeWebhookServerless = exports.testWebhook = exports.deleteStripeAccount = exports.getAllStripeAccounts = exports.getDefaultAccount = exports.setDefaultAccount = exports.unlinkPropertiesFromAccount = exports.linkPropertiesToAccount = exports.createStripeAccount = void 0;
exports.handlePaymentSuccess = handlePaymentSuccess;
exports.handlePaymentFailure = handlePaymentFailure;
exports.handlePaymentCanceled = handlePaymentCanceled;
exports.handleChargeSuccess = handleChargeSuccess;
const http_status_1 = __importDefault(require("http-status"));
const stripe_1 = __importDefault(require("stripe"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const payment_enums_1 = require("../../../shared/enums/payment.enums");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const payments_schema_1 = require("../payments/payments.schema");
const stripe_schema_1 = require("./stripe.schema");
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
            console.log("💰 PAYMENT SUCCESS WEBHOOK STARTED:", {
                timestamp: new Date().toISOString(),
                paymentIntentId: paymentIntent.id,
                metadata: paymentIntent.metadata,
                amount: paymentIntent.amount,
                status: paymentIntent.status,
                accountId,
            });
            // Extract metadata from the payment intent
            let metadata = paymentIntent.metadata;
            // If payment intent has no metadata, try to get it from the charge
            if (!metadata.paymentRecordId) {
                console.log("🔍 PAYMENT SUCCESS WEBHOOK: No metadata in payment intent, checking charges...");
                try {
                    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
                        apiVersion: "2025-06-30.basil",
                    });
                    const charges = yield stripe.charges.list({
                        payment_intent: paymentIntent.id,
                        limit: 1,
                    });
                    if (charges.data.length > 0) {
                        const charge = charges.data[0];
                        console.log("🔍 PAYMENT SUCCESS WEBHOOK: Found charge with metadata:", charge.metadata);
                        metadata = charge.metadata;
                    }
                }
                catch (chargeError) {
                    console.error("❌ PAYMENT SUCCESS WEBHOOK ERROR: Failed to fetch charge metadata:", chargeError.message);
                }
            }
            if (!metadata.paymentRecordId) {
                console.error("❌ PAYMENT SUCCESS WEBHOOK ERROR: Missing required payment metadata:", {
                    timestamp: new Date().toISOString(),
                    metadata: metadata,
                    paymentIntentId: paymentIntent.id,
                });
                throw new Error("Missing required payment metadata");
            }
            // Find existing payment record by paymentRecordId
            console.log("🔍 PAYMENT SUCCESS WEBHOOK: Looking for payment record with ID:", metadata.paymentRecordId);
            const existingPayment = yield payments_schema_1.Payments.findById(metadata.paymentRecordId);
            if (!existingPayment) {
                console.error("❌ PAYMENT SUCCESS WEBHOOK ERROR: No payment record found for ID:", {
                    timestamp: new Date().toISOString(),
                    paymentRecordId: metadata.paymentRecordId,
                    paymentIntentId: paymentIntent.id,
                });
                return;
            }
            // Check if payment already processed to prevent duplicates
            if (existingPayment.status === payment_enums_1.PaymentStatus.PAID) {
                console.log("⚠️ PAYMENT SUCCESS WEBHOOK: Payment already processed, skipping...", {
                    timestamp: new Date().toISOString(),
                    paymentId: existingPayment._id,
                    receiptNumber: existingPayment.receiptNumber,
                    status: existingPayment.status,
                });
                return;
            }
            // Use stored metadata if available, otherwise use PaymentIntent data
            const storedMetadata = existingPayment.stripeMetadata || {};
            console.log("📋 PAYMENT SUCCESS WEBHOOK: Using stored metadata:", storedMetadata);
            // Update existing payment record with PAID status
            console.log("💾 PAYMENT SUCCESS WEBHOOK: Updating payment record with PAID status...", {
                timestamp: new Date().toISOString(),
                paymentId: existingPayment._id,
                receiptNumber: existingPayment.receiptNumber,
                currentStatus: existingPayment.status,
                newStatus: payment_enums_1.PaymentStatus.PAID,
                paymentIntentId: paymentIntent.id,
            });
            const updatedPayment = yield payments_schema_1.Payments.findByIdAndUpdate(existingPayment._id, {
                status: payment_enums_1.PaymentStatus.PAID,
                paidDate: new Date(paymentIntent.created * 1000),
                paymentMethod: "ONLINE",
                transactionId: paymentIntent.id,
                stripeTransactionId: paymentIntent.id,
                stripePaymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount / 100, // Update with actual amount paid
                totalAmount: paymentIntent.amount / 100,
                stripeAccountId: accountId, // Store which Stripe account processed this
                // Update description if we have stored metadata
                description: storedMetadata.paymentDescription || existingPayment.description,
                // Generate new receipt number for paid payment
                receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            }, { new: true });
            if (updatedPayment) {
                console.log("✅ PAYMENT SUCCESS WEBHOOK: Payment updated successfully:", {
                    timestamp: new Date().toISOString(),
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
                console.error("❌ PAYMENT SUCCESS WEBHOOK ERROR: Failed to update payment", {
                    timestamp: new Date().toISOString(),
                    paymentId: existingPayment._id,
                    receiptNumber: existingPayment.receiptNumber,
                });
            }
        }
        catch (error) {
            console.error("❌ PAYMENT SUCCESS WEBHOOK ERROR:", {
                timestamp: new Date().toISOString(),
                error: error.message || "Unknown error",
                stack: error.stack,
                paymentIntentId: paymentIntent.id,
            });
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
                    status: payment_enums_1.PaymentStatus.CANCELLED,
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
                    status: payment_enums_1.PaymentStatus.CANCELLED,
                    stripeAccountId: accountId,
                });
            }
        }
        catch (error) {
            console.error("Payment cancellation handling error:", error);
        }
    });
}
function handleChargeSuccess(charge, accountId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("💳 CHARGE SUCCESS WEBHOOK STARTED:", {
                timestamp: new Date().toISOString(),
                chargeId: charge.id,
                paymentIntentId: charge.payment_intent,
                metadata: charge.metadata,
                amount: charge.amount,
                status: charge.status,
                accountId,
            });
            // Extract metadata from the charge
            const metadata = charge.metadata;
            if (!metadata.tenantId || !metadata.receiptNumber) {
                console.error("❌ CHARGE SUCCESS WEBHOOK ERROR: Missing required payment metadata:", {
                    timestamp: new Date().toISOString(),
                    metadata: metadata,
                    chargeId: charge.id,
                });
                return; // Don't throw error, just log and return
            }
            // Find existing payment record by receipt number
            console.log("🔍 CHARGE SUCCESS WEBHOOK: Looking for payment record with receipt number:", metadata.receiptNumber);
            const existingPayment = yield payments_schema_1.Payments.findOne({
                receiptNumber: metadata.receiptNumber,
            });
            if (!existingPayment) {
                console.error("❌ CHARGE SUCCESS WEBHOOK ERROR: No payment record found for receipt:", {
                    timestamp: new Date().toISOString(),
                    receiptNumber: metadata.receiptNumber,
                    chargeId: charge.id,
                });
                return;
            }
            // Check if payment already processed to prevent duplicates
            if (existingPayment.status === payment_enums_1.PaymentStatus.PAID) {
                console.log("⚠️ CHARGE SUCCESS WEBHOOK: Payment already processed, skipping...", {
                    timestamp: new Date().toISOString(),
                    paymentId: existingPayment._id,
                    receiptNumber: existingPayment.receiptNumber,
                    status: existingPayment.status,
                });
                return;
            }
            // Update existing payment record with PAID status
            console.log("💾 CHARGE SUCCESS WEBHOOK: Updating payment record with PAID status...", {
                timestamp: new Date().toISOString(),
                paymentId: existingPayment._id,
                receiptNumber: existingPayment.receiptNumber,
                currentStatus: existingPayment.status,
                newStatus: payment_enums_1.PaymentStatus.PAID,
                chargeId: charge.id,
            });
            const updatedPayment = yield payments_schema_1.Payments.findByIdAndUpdate(existingPayment._id, {
                status: payment_enums_1.PaymentStatus.PAID,
                paidDate: new Date(charge.created * 1000),
                paymentMethod: "ONLINE",
                transactionId: charge.id,
                stripeTransactionId: charge.id,
                stripePaymentIntentId: charge.payment_intent,
                amount: charge.amount / 100, // Update with actual amount paid
                totalAmount: charge.amount / 100,
                stripeAccountId: accountId, // Store which Stripe account processed this
            }, { new: true });
            if (updatedPayment) {
                console.log("✅ CHARGE SUCCESS WEBHOOK: Payment updated successfully:", {
                    timestamp: new Date().toISOString(),
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
                console.error("❌ CHARGE SUCCESS WEBHOOK ERROR: Failed to update payment", {
                    timestamp: new Date().toISOString(),
                    paymentId: existingPayment._id,
                    receiptNumber: existingPayment.receiptNumber,
                });
            }
        }
        catch (error) {
            console.error("❌ CHARGE SUCCESS WEBHOOK ERROR:", {
                timestamp: new Date().toISOString(),
                error: error.message || "Unknown error",
                stack: error.stack,
                chargeId: charge.id,
            });
            // Don't throw error, just log it
        }
    });
}
// Test endpoint to verify webhook is accessible
exports.testWebhook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("🧪 WEBHOOK TEST: Test endpoint called");
    res.json({
        message: "Webhook endpoint is accessible",
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
    });
}));
// Add this new webhook handler specifically for serverless environments
const handleStripeWebhookServerless = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let event;
    const signature = req.headers["stripe-signature"];
    try {
        // Extract accountId - either from URL path, query param, or metadata
        const accountId = req.query.accountId || req.params.accountId;
        if (!accountId) {
            console.error("No accountId provided in webhook request");
            return res.status(400).json({ error: "Missing accountId" });
        }
        // Get the account with the webhook secret
        const stripeAccount = yield stripe_schema_1.StripeAccounts.findById(accountId).select("+stripeSecretKey +webhookSecret");
        if (!stripeAccount || !stripeAccount.webhookSecret) {
            console.error(`No webhook secret found for account ${accountId}`);
            return res.status(400).json({ error: "Invalid account configuration" });
        }
        // Create Stripe instance with account-specific secret key
        const stripe = new stripe_1.default(stripeAccount.stripeSecretKey, {
            apiVersion: "2025-06-30.basil",
        });
        // For serverless environments, we need to handle the body differently
        let rawBody;
        console.log("🔍 Serverless webhook - Request body type:", typeof req.body);
        console.log("🔍 Serverless webhook - Request body is Buffer:", Buffer.isBuffer(req.body));
        if (Buffer.isBuffer(req.body)) {
            // Raw buffer (ideal case)
            rawBody = req.body;
            console.log("🔧 Serverless: Using raw buffer for webhook verification");
        }
        else if (typeof req.body === "string") {
            // String body
            rawBody = Buffer.from(req.body, "utf8");
            console.log("🔧 Serverless: Using string converted to buffer for webhook verification");
        }
        else if (typeof req.body === "object" && req.body !== null) {
            // Parsed JSON object - reconstruct the raw body
            const jsonString = JSON.stringify(req.body);
            rawBody = Buffer.from(jsonString, "utf8");
            console.log("🔧 Serverless: Using reconstructed buffer from parsed JSON for webhook verification");
            console.log("🔧 Serverless: JSON string length:", jsonString.length);
        }
        else {
            console.error("❌ Serverless: Invalid request body type:", typeof req.body);
            console.error("❌ Serverless: Request body:", req.body);
            return res.status(400).json({
                error: "Invalid request body for serverless webhook. Expected Buffer, string, or object.",
            });
        }
        if (!signature) {
            console.error("❌ Serverless: No Stripe signature found in headers");
            return res.status(400).json({ error: "Missing Stripe signature" });
        }
        console.log("🔧 Serverless: Raw body length:", rawBody.length);
        console.log("🔧 Serverless: Signature:", signature.substring(0, 20) + "...");
        // Verify the webhook signature using the raw buffer
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeAccount.webhookSecret);
        console.log(`🔔 SERVERLESS WEBHOOK RECEIVED: ${event.type} for account ${accountId}`);
        // Handle the event based on type
        switch (event.type) {
            case "payment_intent.succeeded":
                yield handleSuccessfulPayment(event.data.object, stripeAccount);
                break;
            case "payment_intent.payment_failed":
                yield handleFailedPayment(event.data.object, stripeAccount);
                break;
            case "payment_intent.canceled":
                yield handleCanceledPayment(event.data.object, stripeAccount);
                break;
            // Add other event types as needed
            default:
                console.log(`Serverless: Unhandled event type: ${event.type}`);
        }
        // Return a success response
        return res.status(200).json({ received: true });
    }
    catch (error) {
        console.error(`Serverless webhook error: ${error.message}`);
        console.error(`Serverless error stack: ${error.stack}`);
        return res
            .status(400)
            .json({ error: `Serverless Webhook Error: ${error.message}` });
    }
});
exports.handleStripeWebhookServerless = handleStripeWebhookServerless;
const handleStripeWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let event;
    const signature = req.headers["stripe-signature"];
    try {
        // Extract accountId - either from URL path, query param, or metadata
        const accountId = req.query.accountId || req.params.accountId;
        if (!accountId) {
            console.error("No accountId provided in webhook request");
            return res.status(400).json({ error: "Missing accountId" });
        }
        // Get the account with the webhook secret
        const stripeAccount = yield stripe_schema_1.StripeAccounts.findById(accountId).select("+stripeSecretKey +webhookSecret");
        if (!stripeAccount || !stripeAccount.webhookSecret) {
            console.error(`No webhook secret found for account ${accountId}`);
            return res.status(400).json({ error: "Invalid account configuration" });
        }
        // Create Stripe instance with account-specific secret key
        const stripe = new stripe_1.default(stripeAccount.stripeSecretKey, {
            apiVersion: "2025-06-30.basil",
        });
        // Handle different request body types for different environments
        let rawBody;
        console.log("🔍 Request body type:", typeof req.body);
        console.log("🔍 Request body is Buffer:", Buffer.isBuffer(req.body));
        if (Buffer.isBuffer(req.body)) {
            // Development environment - raw buffer from express.raw()
            rawBody = req.body;
            console.log("🔧 Using raw buffer for webhook verification");
        }
        else if (typeof req.body === "string") {
            // Production environment - string that needs to be converted to buffer
            rawBody = Buffer.from(req.body, "utf8");
            console.log("🔧 Using string converted to buffer for webhook verification");
        }
        else if (typeof req.body === "object" && req.body !== null) {
            // Production environment - parsed JSON object
            // We need to reconstruct the raw body from the parsed object
            rawBody = Buffer.from(JSON.stringify(req.body), "utf8");
            console.log("🔧 Using reconstructed buffer from parsed JSON for webhook verification");
        }
        else {
            console.error("❌ Invalid request body type:", typeof req.body);
            console.error("❌ Request body:", req.body);
            return res.status(400).json({
                error: "Invalid request body. Expected Buffer, string, or object.",
            });
        }
        if (!signature) {
            console.error("❌ No Stripe signature found in headers");
            return res.status(400).json({ error: "Missing Stripe signature" });
        }
        console.log("🔧 Raw body length:", rawBody.length);
        console.log("🔧 Signature:", signature.substring(0, 20) + "...");
        // Verify the webhook signature using the raw buffer
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeAccount.webhookSecret);
        console.log(`🔔 WEBHOOK RECEIVED: ${event.type} for account ${accountId}`);
        // Handle the event based on type
        switch (event.type) {
            case "payment_intent.succeeded":
                yield handleSuccessfulPayment(event.data.object, stripeAccount);
                break;
            case "payment_intent.payment_failed":
                yield handleFailedPayment(event.data.object, stripeAccount);
                break;
            case "payment_intent.canceled":
                yield handleCanceledPayment(event.data.object, stripeAccount);
                break;
            // Add other event types as needed
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        // Return a success response
        return res.status(200).json({ received: true });
    }
    catch (error) {
        console.error(`Webhook error: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
        return res.status(400).json({ error: `Webhook Error: ${error.message}` });
    }
});
exports.handleStripeWebhook = handleStripeWebhook;
// Process successful payments with multiple fallback strategies
function handleSuccessfulPayment(paymentIntent, stripeAccount) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        try {
            console.log("🎉 Processing successful payment:", paymentIntent.id);
            console.log("Payment metadata:", paymentIntent.metadata);
            // If we have metadata with paymentRecordId, use it to update the payment record
            if (paymentIntent.metadata && paymentIntent.metadata.paymentRecordId) {
                const paymentRecordId = paymentIntent.metadata.paymentRecordId;
                // Update the payment record
                const updatedPayment = yield payments_schema_1.Payments.findByIdAndUpdate(paymentRecordId, {
                    status: payment_enums_1.PaymentStatus.PAID,
                    paidDate: new Date(paymentIntent.created * 1000),
                    paymentMethod: "ONLINE",
                    stripePaymentIntentId: paymentIntent.id,
                    stripeTransactionId: ((_b = (_a = paymentIntent.charges) === null || _a === void 0 ? void 0 : _a.data[0]) === null || _b === void 0 ? void 0 : _b.id) || paymentIntent.latest_charge,
                    stripeMetadata: paymentIntent.metadata,
                    receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                }, { new: true });
                if (updatedPayment) {
                    console.log(`✅ Payment record updated successfully: ${updatedPayment._id}`);
                    // Perform any additional actions (e.g., send receipt email)
                }
                else {
                    console.error(`❌ Payment record not found: ${paymentRecordId}`);
                    // Handle case where payment record doesn't exist
                }
            }
            else {
                // If metadata is missing, try to find payment by Payment Intent ID
                console.log("Payment Intent metadata missing, searching by Payment Intent ID");
                const existingPayment = yield payments_schema_1.Payments.findOne({
                    stripePaymentIntentId: paymentIntent.id,
                });
                if (existingPayment) {
                    existingPayment.status = payment_enums_1.PaymentStatus.PAID;
                    existingPayment.paidDate = new Date(paymentIntent.created * 1000);
                    existingPayment.stripeTransactionId =
                        ((_d = (_c = paymentIntent.charges) === null || _c === void 0 ? void 0 : _c.data[0]) === null || _d === void 0 ? void 0 : _d.id) || paymentIntent.latest_charge;
                    yield existingPayment.save();
                    console.log(`✅ Payment record updated by PaymentIntent ID: ${existingPayment._id}`);
                }
                else {
                    // Try finding by payment link as last resort
                    console.log("Payment not found, attempting to lookup via Checkout Session");
                    // Create stripe instance with account secret key
                    const stripe = new stripe_1.default(stripeAccount.stripeSecretKey, {
                        apiVersion: "2025-06-30.basil",
                    });
                    // Try to get related checkout session
                    try {
                        const sessions = yield stripe.checkout.sessions.list({
                            payment_intent: paymentIntent.id,
                            limit: 1,
                        });
                        if (sessions.data.length > 0) {
                            const session = sessions.data[0];
                            // If we have a payment link ID in the session, use it to find our payment
                            if (session.payment_link) {
                                const paymentByLink = yield payments_schema_1.Payments.findOne({
                                    stripePaymentLinkId: session.payment_link,
                                });
                                if (paymentByLink) {
                                    paymentByLink.status = payment_enums_1.PaymentStatus.PAID;
                                    paymentByLink.paidDate = new Date(paymentIntent.created * 1000);
                                    paymentByLink.stripePaymentIntentId = paymentIntent.id;
                                    paymentByLink.stripeTransactionId =
                                        ((_f = (_e = paymentIntent.charges) === null || _e === void 0 ? void 0 : _e.data[0]) === null || _f === void 0 ? void 0 : _f.id) ||
                                            paymentIntent.latest_charge;
                                    yield paymentByLink.save();
                                    console.log(`✅ Payment record updated by Payment Link ID: ${paymentByLink._id}`);
                                }
                                else {
                                    console.error(`❌ No payment found for Payment Link: ${session.payment_link}`);
                                    // Consider creating a new payment record or logging this for manual review
                                }
                            }
                        }
                    }
                    catch (err) {
                        console.error("Error fetching checkout session:", err);
                    }
                }
            }
        }
        catch (error) {
            console.error("Error handling successful payment:", error);
        }
    });
}
// Process failed payments
function handleFailedPayment(paymentIntent, stripeAccount) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            console.log("❌ Processing failed payment:", paymentIntent.id);
            // If we have metadata with paymentRecordId, use it to update the payment record
            if (paymentIntent.metadata && paymentIntent.metadata.paymentRecordId) {
                const paymentRecordId = paymentIntent.metadata.paymentRecordId;
                // Update the payment record
                const updatedPayment = yield payments_schema_1.Payments.findByIdAndUpdate(paymentRecordId, {
                    status: payment_enums_1.PaymentStatus.PENDING, // Use PENDING since FAILED doesn't exist in enum
                    stripePaymentIntentId: paymentIntent.id,
                    stripeMetadata: Object.assign(Object.assign({}, paymentIntent.metadata), { error: ((_a = paymentIntent.last_payment_error) === null || _a === void 0 ? void 0 : _a.message) || "Payment failed" }),
                }, { new: true });
                if (updatedPayment) {
                    console.log(`✅ Failed payment record updated: ${updatedPayment._id}`);
                }
                else {
                    console.error(`❌ Failed payment record not found: ${paymentRecordId}`);
                }
            }
            else {
                // If no metadata, try to find by Payment Intent ID
                const existingPayment = yield payments_schema_1.Payments.findOne({
                    stripePaymentIntentId: paymentIntent.id,
                });
                if (existingPayment) {
                    existingPayment.status = payment_enums_1.PaymentStatus.PENDING; // Use PENDING
                    existingPayment.stripeMetadata = Object.assign(Object.assign({}, existingPayment.stripeMetadata), { error: ((_b = paymentIntent.last_payment_error) === null || _b === void 0 ? void 0 : _b.message) || "Payment failed" });
                    yield existingPayment.save();
                    console.log(`✅ Failed payment record updated by PaymentIntent ID: ${existingPayment._id}`);
                }
            }
        }
        catch (error) {
            console.error("Error handling failed payment:", error);
        }
    });
}
// Process canceled payments
function handleCanceledPayment(paymentIntent, stripeAccount) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🚫 Processing canceled payment:", paymentIntent.id);
            // If we have metadata with paymentRecordId, use it to update the payment record
            if (paymentIntent.metadata && paymentIntent.metadata.paymentRecordId) {
                const paymentRecordId = paymentIntent.metadata.paymentRecordId;
                // Update the payment record
                const updatedPayment = yield payments_schema_1.Payments.findByIdAndUpdate(paymentRecordId, {
                    status: payment_enums_1.PaymentStatus.CANCELLED,
                    stripePaymentIntentId: paymentIntent.id,
                    stripeMetadata: Object.assign(Object.assign({}, paymentIntent.metadata), { error: "Payment was canceled" }),
                }, { new: true });
                if (updatedPayment) {
                    console.log(`✅ Canceled payment record updated: ${updatedPayment._id}`);
                }
                else {
                    console.error(`❌ Canceled payment record not found: ${paymentRecordId}`);
                }
            }
            else {
                // If no metadata, try to find by Payment Intent ID
                const existingPayment = yield payments_schema_1.Payments.findOne({
                    stripePaymentIntentId: paymentIntent.id,
                });
                if (existingPayment) {
                    existingPayment.status = payment_enums_1.PaymentStatus.CANCELLED;
                    existingPayment.stripeMetadata = Object.assign(Object.assign({}, existingPayment.stripeMetadata), { error: "Payment was canceled" });
                    yield existingPayment.save();
                    console.log(`✅ Canceled payment record updated by PaymentIntent ID: ${existingPayment._id}`);
                }
            }
        }
        catch (error) {
            console.error("Error handling canceled payment:", error);
        }
    });
}
