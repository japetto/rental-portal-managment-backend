import { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import {
  createPaymentWithLink,
  createStripeAccount,
  deleteStripeAccount,
  getAccountStatistics,
  getAllStripeAccounts,
  getAssignablePropertiesForAccount,
  getAvailableStripeAccounts,
  getDefaultAccount,
  getPaymentLinkDetails,
  getStripeAccountById,
  getStripeAccountsByProperty,
  getUnassignedProperties,
  handleWebhook,
  linkPropertiesToAccount,
  setDefaultAccount,
  syncPaymentHistory,
  unlinkPropertiesFromAccount,
  updateStripeAccount,
  verifyStripeAccount,
  webhookStatus,
} from "./stripe.controller";
import {
  createPaymentWithLinkSchema,
  createStripeAccountSchema,
  deleteStripeAccountSchema,
  getPaymentLinkDetailsSchema,
  getStripeAccountByIdSchema,
  getStripeAccountsByPropertySchema,
  linkPropertiesToAccountSchema,
  setDefaultAccountSchema,
  syncPaymentHistorySchema,
  unlinkPropertiesFromAccountSchema,
  updateStripeAccountSchema,
  verifyStripeAccountSchema,
} from "./stripe.validation";

const router = Router();

// Stripe Account Management Routes (Admin only)
router.post(
  "/accounts",
  adminAuth,
  zodValidationRequest(createStripeAccountSchema),
  createStripeAccount,
);

// Property linking/unlinking routes
router.post(
  "/accounts/link-properties",
  adminAuth,
  zodValidationRequest(linkPropertiesToAccountSchema),
  linkPropertiesToAccount,
);
router.post(
  "/accounts/unlink-properties",
  adminAuth,
  zodValidationRequest(unlinkPropertiesFromAccountSchema),
  unlinkPropertiesFromAccount,
);

// Default account management
router.post(
  "/accounts/set-default",
  adminAuth,
  zodValidationRequest(setDefaultAccountSchema),
  setDefaultAccount,
);
router.get("/accounts/default", adminAuth, getDefaultAccount);

// Account listing and details
router.get("/accounts", adminAuth, getAllStripeAccounts);

// Get account statistics for debugging
router.get("/accounts/statistics", adminAuth, getAccountStatistics);

// Get all properties with stripe details
router.get(
  "/accounts/:accountId",
  adminAuth,
  zodValidationRequest(getStripeAccountByIdSchema),
  getStripeAccountById,
);

// Get all stripe accounts by property
router.get(
  "/accounts/property/:propertyId",
  adminAuth,
  zodValidationRequest(getStripeAccountsByPropertySchema),
  getStripeAccountsByProperty,
);

// Get all available stripe accounts by property
router.get(
  "/accounts/available/:propertyId",
  adminAuth,
  getAvailableStripeAccounts,
);

// Get unassigned properties (for assignment to Stripe accounts)
router.get("/properties/unassigned", adminAuth, getUnassignedProperties);

// Get assignable properties for a specific Stripe account
router.get(
  "/accounts/:accountId/assignable-properties",
  adminAuth,
  getAssignablePropertiesForAccount,
);

// Account updates and management
router.patch(
  "/accounts/:accountId",
  adminAuth,
  zodValidationRequest(updateStripeAccountSchema),
  updateStripeAccount,
);

// Delete stripe account
router.delete(
  "/accounts/:accountId",
  adminAuth,
  zodValidationRequest(deleteStripeAccountSchema),
  deleteStripeAccount,
);

// Verify stripe account
router.patch(
  "/accounts/:accountId/verify",
  adminAuth,
  zodValidationRequest(verifyStripeAccountSchema),
  verifyStripeAccount,
);

// Payment Link Management Routes (Admin only)

// Create payment link
router.post(
  "/create-payment-link",
  adminAuth,
  zodValidationRequest(createPaymentWithLinkSchema),
  createPaymentWithLink,
);

// Get payment link details
router.get(
  "/payment-link/:paymentLinkId",
  adminAuth,
  zodValidationRequest(getPaymentLinkDetailsSchema),
  getPaymentLinkDetails,
);

// Webhook Routes (No auth required for Stripe webhooks)
router.post("/webhook", handleWebhook);
router.get("/webhook/status", webhookStatus);

// Payment History Sync (Admin only)
router.post(
  "/sync-payment-history/:userId",
  adminAuth,
  zodValidationRequest(syncPaymentHistorySchema),
  syncPaymentHistory,
);

export const stripeRoutes = router;
