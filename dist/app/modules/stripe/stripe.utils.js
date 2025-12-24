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
exports.createWebhookEndpoint = exports.verifyStripeAccountId = exports.formatAddress = exports.getValidRedirectUrl = void 0;
const config_1 = __importDefault(require("../../../config/config"));
const stripe_schema_1 = require("./stripe.schema");
const stripe_service_1 = require("./stripe.service");
// Helper function to ensure URL has proper scheme
const getValidRedirectUrl = (path) => {
    const baseUrl = config_1.default.client_url || "http://localhost:3000";
    // If baseUrl already has a scheme, use it as is
    if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
        return `${baseUrl}${path}`;
    }
    // If no scheme, default to https
    return `https://${baseUrl}${path}`;
};
exports.getValidRedirectUrl = getValidRedirectUrl;
// Helper function to format address object to string
const formatAddress = (address) => {
    if (!address)
        return "N/A";
    // If address is already a string, return it
    if (typeof address === "string")
        return address;
    // If address is an object, format it
    if (typeof address === "object") {
        const parts = [];
        if (address.street)
            parts.push(address.street);
        if (address.city)
            parts.push(address.city);
        if (address.state)
            parts.push(address.state);
        if (address.zip)
            parts.push(address.zip);
        if (address.country)
            parts.push(address.country);
        return parts.length > 0 ? parts.join(", ") : "N/A";
    }
    return "N/A";
};
exports.formatAddress = formatAddress;
// Verify Stripe secret key with Stripe API
const verifyStripeAccountId = (secretKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Trim whitespace and validate the secret key format
        const trimmedSecretKey = secretKey.trim();
        if (!trimmedSecretKey.startsWith("sk_") &&
            !trimmedSecretKey.startsWith("rk_")) {
            throw new Error(`Invalid Stripe key format. Must start with 'sk_' (secret key) or 'rk_' (restricted key). Received: ${trimmedSecretKey.substring(0, 10)}...`);
        }
        // Create Stripe instance with account-specific secret key
        const stripe = (0, stripe_service_1.createStripeInstance)(trimmedSecretKey);
        // Verify the secret key by making a test API call
        // Using balance.retrieve() is more reliable than paymentLinks.list()
        yield stripe.balance.retrieve();
        return {
            isValid: true,
            message: "Stripe secret key verified successfully",
        };
    }
    catch (error) {
        if (error.code === "authentication_error") {
            throw new Error("Invalid Stripe secret key. Please check your credentials");
        }
        throw new Error(`Stripe account verification failed: ${error.message}`);
    }
});
exports.verifyStripeAccountId = verifyStripeAccountId;
// Create webhook endpoint for a Stripe account
const createWebhookEndpoint = (accountId, webhookUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get the Stripe account with secret key
        const stripeAccount = yield stripe_schema_1.StripeAccounts.findById(accountId).select("+stripeSecretKey");
        if (!stripeAccount) {
            throw new Error("Stripe account not found");
        }
        if (!stripeAccount.stripeSecretKey) {
            throw new Error("Stripe secret key is missing for this account");
        }
        // Create Stripe instance with account-specific secret key
        const stripe = (0, stripe_service_1.createStripeInstance)(stripeAccount.stripeSecretKey);
        // Make sure the webhookUrl includes the accountId as a query parameter
        const webhookUrlWithId = webhookUrl.includes("?")
            ? `${webhookUrl}&accountId=${accountId}`
            : `${webhookUrl}?accountId=${accountId}`;
        // Create webhook endpoint
        const webhook = yield stripe.webhookEndpoints.create({
            url: webhookUrlWithId,
            enabled_events: [
                "payment_intent.succeeded",
                "payment_intent.payment_failed",
                "payment_intent.canceled",
                "payment_link.created",
                "payment_link.updated",
            ],
            metadata: {
                accountId: accountId,
                accountName: stripeAccount.name,
                propertyIds: stripeAccount.propertyIds.join(","),
            },
        });
        console.log(`✅ Webhook created for account ${stripeAccount.name}:`, {
            webhookId: webhook.id,
            url: webhook.url,
            status: webhook.status,
        });
        // IMPORTANT: Store the webhook secret when it's created
        // This is only available at creation time
        yield stripe_schema_1.StripeAccounts.findByIdAndUpdate(accountId, {
            webhookId: webhook.id,
            webhookUrl: webhookUrlWithId,
            webhookSecret: webhook.secret, // Store the webhook secret
            webhookStatus: "ACTIVE",
            webhookCreatedAt: new Date(),
        });
        return webhook;
    }
    catch (error) {
        console.error("Error creating webhook endpoint:", error);
        throw new Error(`Failed to create webhook: ${error.message}`);
    }
});
exports.createWebhookEndpoint = createWebhookEndpoint;
