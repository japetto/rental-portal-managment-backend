import express from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import { StripeController } from "./stripe.controller";

const router = express.Router();

// Webhook endpoint - needs raw body for signature verification
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  StripeController.handleWebhook,
);

// Webhook status check endpoint
router.get("/webhook-status", StripeController.webhookStatus);

// Create payment with unique payment link (admin only)
router.post(
  "/create-payment-link",
  adminAuth,
  StripeController.createPaymentWithLink,
);

// Get payment link details (admin only)
router.get(
  "/payment-link/:paymentLinkId",
  adminAuth,
  StripeController.getPaymentLinkDetails,
);

// Admin-only endpoint for syncing payment history
router.get(
  "/sync-payment-history/:userId",
  adminAuth,
  StripeController.syncPaymentHistory,
);

export const StripeRouter = router;
