import express, { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import {
  createStripeAccount,
  deleteStripeAccount,
  getAllStripeAccounts,
  getDefaultAccount,
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

// Vercel-specific webhook handler - use raw body to preserve exact payload
router.post(
  "/webhook-vercel",
  express.raw({ type: "application/json" }),
  (req, res) => {
    handleStripeWebhookServerless(req, res);
  },
);

export const stripeRoutes = router;
