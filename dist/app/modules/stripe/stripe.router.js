"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeRoutes = void 0;
const express_1 = require("express");
const adminAuth_1 = require("../../../middlewares/adminAuth");
const zodValidationRequest_1 = __importDefault(require("../../../middlewares/zodValidationRequest"));
const stripe_controller_1 = require("./stripe.controller");
const stripe_validation_1 = require("./stripe.validation");
const router = (0, express_1.Router)();
// ========================================
// STRIPE ACCOUNT MANAGEMENT ROUTES (Admin only)
// ========================================
// Create new Stripe account
router.post("/accounts", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.createStripeAccountSchema), stripe_controller_1.createStripeAccount);
// Get all Stripe accounts
router.get("/accounts", adminAuth_1.adminAuth, stripe_controller_1.getAllStripeAccounts);
// Get default account
router.get("/accounts/default", adminAuth_1.adminAuth, stripe_controller_1.getDefaultAccount);
// Set default account
router.post("/accounts/set-default", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.setDefaultAccountSchema), stripe_controller_1.setDefaultAccount);
// Delete Stripe account
router.delete("/accounts/:accountId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.deleteStripeAccountSchema), stripe_controller_1.deleteStripeAccount);
// ========================================
// PROPERTY LINKING/UNLINKING ROUTES (Admin only)
// ========================================
// Link properties to Stripe account
router.post("/accounts/link-properties", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.linkPropertiesToAccountSchema), stripe_controller_1.linkPropertiesToAccount);
// Unlink properties from Stripe account
router.post("/accounts/unlink-properties", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.unlinkPropertiesFromAccountSchema), stripe_controller_1.unlinkPropertiesFromAccount);
// ========================================
// WEBHOOK ROUTES
// ========================================
// Test webhook endpoint (No auth required)
router.get("/webhook/test", stripe_controller_1.testWebhook);
// Test webhook secret endpoint (Admin only)
router.get("/webhook/test-secret/:accountId", adminAuth_1.adminAuth, stripe_controller_1.testWebhookSecret);
// Vercel-specific webhook handler - no body parsing to preserve raw body
router.post("/webhook-vercel", (req, res) => {
    // Ensure no body parsing middleware is applied
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
        // If body is already parsed, we need to reconstruct it
        const rawBody = Buffer.from(JSON.stringify(req.body), "utf8");
        req.body = rawBody;
    }
    (0, stripe_controller_1.handleStripeWebhookServerless)(req, res);
});
exports.stripeRoutes = router;
