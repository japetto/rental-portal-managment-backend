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
exports.StripeService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const payments_schema_1 = require("../payments/payments.schema");
const properties_schema_1 = require("../properties/properties.schema");
const users_schema_1 = require("../users/users.schema");
class StripeService {
    constructor() {
        this.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
            apiVersion: "2025-06-30.basil",
        });
    }
    // Validate payment link exists in Stripe
    validatePaymentLink(paymentLinkId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const paymentLink = yield this.stripe.paymentLinks.retrieve(paymentLinkId);
                return paymentLink.active;
            }
            catch (error) {
                return false;
            }
        });
    }
    // Get payment link details
    getPaymentLinkDetails(paymentLinkId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.stripe.paymentLinks.retrieve(paymentLinkId);
        });
    }
    // Get transaction history for a payment link
    getPaymentLinkTransactions(paymentLinkId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.stripe.paymentIntents.list({
                limit: 100,
            });
        });
    }
    // Cancel payment intent (for error handling)
    cancelPaymentIntent(paymentIntentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.stripe.paymentIntents.cancel(paymentIntentId);
        });
    }
    // Sync existing payments from Stripe to database
    syncStripePayments(paymentLinkId, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const payments = yield this.getPaymentLinkTransactions(paymentLinkId);
            for (const payment of payments.data) {
                // Check if payment already exists in database
                const existingPayment = yield payments_schema_1.Payments.findOne({
                    stripeTransactionId: payment.id,
                });
                if (!existingPayment && payment.status === "succeeded") {
                    // Create payment record
                    yield this.createPaymentFromStripe(payment, tenantId);
                }
            }
        });
    }
    // Create payment record from Stripe data
    createPaymentFromStripe(stripePayment, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const user = yield users_schema_1.Users.findById(tenantId);
            if (!user)
                throw new Error("User not found");
            // Find property by propertyName from metadata
            const propertyName = (_a = stripePayment.metadata) === null || _a === void 0 ? void 0 : _a.propertyName;
            if (!propertyName)
                throw new Error("Property name not found in payment metadata");
            const property = yield properties_schema_1.Properties.findOne({ propertyName });
            if (!property) {
                // Cancel payment if property not found
                yield this.cancelPaymentIntent(stripePayment.id);
                throw new Error(`Property not found: ${propertyName}`);
            }
            // Create payment record
            return payments_schema_1.Payments.create({
                tenantId,
                propertyId: property._id,
                spotId: user.spotId,
                amount: stripePayment.amount / 100, // Convert from cents
                type: "RENT",
                status: "PAID",
                dueDate: new Date(),
                paidDate: new Date(stripePayment.created * 1000),
                paymentMethod: "ONLINE",
                transactionId: stripePayment.id,
                stripeTransactionId: stripePayment.id,
                stripePaymentLinkId: user.stripePaymentLinkId,
                receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                description: "Monthly Rent Payment",
                totalAmount: stripePayment.amount / 100,
                createdBy: "SYSTEM",
            });
        });
    }
    // Construct webhook event for verification
    static constructWebhookEvent(payload, signature) {
        const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
            apiVersion: "2025-06-30.basil",
        });
        return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
    }
}
exports.StripeService = StripeService;
