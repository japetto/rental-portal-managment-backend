import { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import { StripeController } from "./stripe.controller";

const router = Router();

// Webhook endpoint (no auth required - Stripe sends webhooks)
router.post("/webhook", StripeController.handleWebhook);

// Sync payment history (admin only)
router.post(
  "/sync-payment-history/:userId",
  adminAuth,
  StripeController.syncPaymentHistory,
);

export { router as StripeRouter };
