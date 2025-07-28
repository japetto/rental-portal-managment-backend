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

// Admin-only endpoint for syncing payment history
router.get(
  "/sync-payment-history/:userId",
  adminAuth,
  StripeController.syncPaymentHistory,
);

export const StripeRouter = router;
