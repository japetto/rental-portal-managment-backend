"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeRouter = void 0;
const express_1 = require("express");
const adminAuth_1 = require("../../../middlewares/adminAuth");
const stripe_controller_1 = require("./stripe.controller");
const router = (0, express_1.Router)();
exports.StripeRouter = router;
// Webhook endpoint (no auth required - Stripe sends webhooks)
router.post("/webhook", stripe_controller_1.StripeController.handleWebhook);
// Sync payment history (admin only)
router.post("/sync-payment-history/:userId", adminAuth_1.adminAuth, stripe_controller_1.StripeController.syncPaymentHistory);
