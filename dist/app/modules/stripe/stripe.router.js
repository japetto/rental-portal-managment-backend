"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeRouter = void 0;
const express_1 = __importDefault(require("express"));
const adminAuth_1 = require("../../../middlewares/adminAuth");
const stripe_controller_1 = require("./stripe.controller");
const router = express_1.default.Router();
// Webhook endpoint - needs raw body for signature verification
router.post("/webhook", express_1.default.raw({ type: "application/json" }), stripe_controller_1.StripeController.handleWebhook);
// Webhook status check endpoint
router.get("/webhook-status", stripe_controller_1.StripeController.webhookStatus);
// Admin-only endpoint for syncing payment history
router.get("/sync-payment-history/:userId", adminAuth_1.adminAuth, stripe_controller_1.StripeController.syncPaymentHistory);
exports.StripeRouter = router;
