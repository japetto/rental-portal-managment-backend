"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeRoutes = void 0;
const express_1 = require("express");
const adminAuth_1 = require("../../../middlewares/adminAuth");
const userAuth_1 = require("../../../middlewares/userAuth");
const zodValidationRequest_1 = __importDefault(require("../../../middlewares/zodValidationRequest"));
const stripe_controller_1 = require("./stripe.controller");
const stripe_validation_1 = require("./stripe.validation");
const router = (0, express_1.Router)();
// Stripe Account Management Routes (Admin only)
router.post("/accounts", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.createStripeAccountSchema), stripe_controller_1.createStripeAccount);
// Property linking/unlinking routes
router.post("/accounts/link-properties", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.linkPropertiesToAccountSchema), stripe_controller_1.linkPropertiesToAccount);
router.post("/accounts/unlink-properties", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.unlinkPropertiesFromAccountSchema), stripe_controller_1.unlinkPropertiesFromAccount);
// Default account management
router.post("/accounts/set-default", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.setDefaultAccountSchema), stripe_controller_1.setDefaultAccount);
router.get("/accounts/default", adminAuth_1.adminAuth, stripe_controller_1.getDefaultAccount);
// Account listing and details
router.get("/accounts", adminAuth_1.adminAuth, stripe_controller_1.getAllStripeAccounts);
// Get account statistics for debugging
router.get("/accounts/statistics", adminAuth_1.adminAuth, stripe_controller_1.getAccountStatistics);
// Get all properties with stripe details
router.get("/accounts/:accountId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.getStripeAccountByIdSchema), stripe_controller_1.getStripeAccountById);
// Get all stripe accounts by property
router.get("/accounts/property/:propertyId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.getStripeAccountsByPropertySchema), stripe_controller_1.getStripeAccountsByProperty);
// Get all available stripe accounts by property
router.get("/accounts/available/:propertyId", adminAuth_1.adminAuth, stripe_controller_1.getAvailableStripeAccounts);
// Get unassigned properties (for assignment to Stripe accounts)
router.get("/properties/unassigned", adminAuth_1.adminAuth, stripe_controller_1.getUnassignedProperties);
// Get assignable properties for a specific Stripe account
router.get("/accounts/:accountId/assignable-properties", adminAuth_1.adminAuth, stripe_controller_1.getAssignablePropertiesForAccount);
// Account updates and management
router.patch("/accounts/:accountId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.updateStripeAccountSchema), stripe_controller_1.updateStripeAccount);
// Update stripe account secret key (for debugging)
router.patch("/accounts/:accountId/secret-key", adminAuth_1.adminAuth, stripe_controller_1.updateStripeAccountSecretKey);
// Delete stripe account
router.delete("/accounts/:accountId", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.deleteStripeAccountSchema), stripe_controller_1.deleteStripeAccount);
// Verify stripe account
router.patch("/accounts/:accountId/verify", adminAuth_1.adminAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.verifyStripeAccountSchema), stripe_controller_1.verifyStripeAccount);
// Payment Link Management Routes (Admin only)
// Create payment link
router.post("/create-payment-link", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.createPaymentWithLinkSchema), stripe_controller_1.createPaymentWithLink);
// Get payment link details
router.get("/payment-link/:paymentLinkId", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.getPaymentLinkDetailsSchema), stripe_controller_1.getPaymentLinkDetails);
// Get comprehensive tenant payment status with automatic payment creation
router.get("/tenant-payment-status/:tenantId", userAuth_1.userAuth, stripe_controller_1.getTenantPaymentStatus);
// Webhook Routes (No auth required for Stripe webhooks)
router.post("/webhook", stripe_controller_1.handleWebhook);
// Webhook status check endpoint
router.get("/webhook/status", stripe_controller_1.webhookStatus);
// Webhook Management Routes (Admin only)
router.post("/webhooks/:accountId", adminAuth_1.adminAuth, stripe_controller_1.createWebhook);
router.post("/webhooks/create-by-type", adminAuth_1.adminAuth, stripe_controller_1.createWebhooksForAllAccounts);
router.get("/webhooks/:accountId", adminAuth_1.adminAuth, stripe_controller_1.listWebhooks);
router.get("/webhooks/:accountId/:webhookId", adminAuth_1.adminAuth, stripe_controller_1.getWebhook);
router.patch("/webhooks/:accountId/:webhookId", adminAuth_1.adminAuth, stripe_controller_1.updateWebhook);
router.delete("/webhooks/:accountId/:webhookId", adminAuth_1.adminAuth, stripe_controller_1.deleteWebhook);
// Payment History Sync (Admin only)
router.post("/sync-payment-history/:userId", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(stripe_validation_1.syncPaymentHistorySchema), stripe_controller_1.syncPaymentHistory);
exports.stripeRoutes = router;
