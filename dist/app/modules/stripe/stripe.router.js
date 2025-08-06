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
// Handle Stripe webhooks (No auth required)
router.post("/webhook", stripe_controller_1.handleWebhook);
exports.stripeRoutes = router;
