import express, { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import {
  createStripeAccount,
  deleteStripeAccount,
  getAllStripeAccounts,
  getDefaultAccount,
  handleStripeWebhook,
  handleStripeWebhookServerless,
  linkPropertiesToAccount,
  setDefaultAccount,
  testWebhook,
  testWebhookSecret,
  unlinkPropertiesFromAccount,
} from "./stripe.controller";
import {
  createStripeAccountSchema,
  deleteStripeAccountSchema,
  linkPropertiesToAccountSchema,
  setDefaultAccountSchema,
  unlinkPropertiesFromAccountSchema,
} from "./stripe.validation";

const router = Router();

// ========================================
// STRIPE ACCOUNT MANAGEMENT ROUTES (Admin only)
// ========================================

// Create new Stripe account
router.post(
  "/accounts",
  adminAuth,
  zodValidationRequest(createStripeAccountSchema),
  createStripeAccount,
);

// Get all Stripe accounts
router.get("/accounts", adminAuth, getAllStripeAccounts);

// Get default account
router.get("/accounts/default", adminAuth, getDefaultAccount);

// Set default account
router.post(
  "/accounts/set-default",
  adminAuth,
  zodValidationRequest(setDefaultAccountSchema),
  setDefaultAccount,
);

// Delete Stripe account
router.delete(
  "/accounts/:accountId",
  adminAuth,
  zodValidationRequest(deleteStripeAccountSchema),
  deleteStripeAccount,
);

// ========================================
// PROPERTY LINKING/UNLINKING ROUTES (Admin only)
// ========================================

// Link properties to Stripe account
router.post(
  "/accounts/link-properties",
  adminAuth,
  zodValidationRequest(linkPropertiesToAccountSchema),
  linkPropertiesToAccount,
);

// Unlink properties from Stripe account
router.post(
  "/accounts/unlink-properties",
  adminAuth,
  zodValidationRequest(unlinkPropertiesFromAccountSchema),
  unlinkPropertiesFromAccount,
);

// ========================================
// WEBHOOK ROUTES
// ========================================

// Test webhook endpoint (No auth required)
router.get("/webhook/test", testWebhook);

// Test webhook secret endpoint (Admin only)
router.get("/webhook/test-secret/:accountId", adminAuth, testWebhookSecret);

// Handle Stripe webhooks (No auth required)
// Use express.raw() for development and handle parsed JSON for production
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

// Serverless webhook handler for production environments
router.post("/webhook-serverless", handleStripeWebhookServerless);

// Vercel-specific webhook handler - no body parsing to preserve raw body
router.post("/webhook-vercel", (req, res) => {
  // Ensure no body parsing middleware is applied
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    // If body is already parsed, we need to reconstruct it
    const rawBody = Buffer.from(JSON.stringify(req.body), "utf8");
    req.body = rawBody;
  }
  handleStripeWebhookServerless(req, res);
});

export const stripeRoutes = router;
