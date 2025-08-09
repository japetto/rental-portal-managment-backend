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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeRoutes = void 0;
const express_1 = __importStar(require("express"));
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
// Vercel-specific webhook handler - use raw body to preserve exact payload
router.post("/webhook-vercel", express_1.default.raw({ type: "application/json" }), (req, res) => {
    (0, stripe_controller_1.handleStripeWebhookServerless)(req, res);
});
exports.stripeRoutes = router;
