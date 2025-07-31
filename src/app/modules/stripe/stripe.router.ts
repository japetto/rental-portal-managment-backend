import { Router } from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import {
  createPaymentWithLink,
  createStripeAccount,
  deleteStripeAccount,
  getAllStripeAccounts,
  getAvailableStripeAccounts,
  getPaymentLinkDetails,
  getStripeAccountById,
  getStripeAccountByProperty,
  handleWebhook,
  linkStripeAccountToProperty,
  syncPaymentHistory,
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
  getStripeAccountByPropertySchema,
  linkStripeAccountToPropertySchema,
  syncPaymentHistorySchema,
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
router.post(
  "/accounts/link",
  adminAuth,
  zodValidationRequest(linkStripeAccountToPropertySchema),
  linkStripeAccountToProperty,
);
router.get("/accounts", adminAuth, getAllStripeAccounts);
router.get(
  "/accounts/:accountId",
  adminAuth,
  zodValidationRequest(getStripeAccountByIdSchema),
  getStripeAccountById,
);
router.get(
  "/accounts/property/:propertyId",
  adminAuth,
  zodValidationRequest(getStripeAccountByPropertySchema),
  getStripeAccountByProperty,
);
router.get(
  "/accounts/available/:propertyId",
  adminAuth,
  getAvailableStripeAccounts,
);
router.patch(
  "/accounts/:accountId",
  adminAuth,
  zodValidationRequest(updateStripeAccountSchema),
  updateStripeAccount,
);
router.delete(
  "/accounts/:accountId",
  adminAuth,
  zodValidationRequest(deleteStripeAccountSchema),
  deleteStripeAccount,
);
router.patch(
  "/accounts/:accountId/verify",
  adminAuth,
  zodValidationRequest(verifyStripeAccountSchema),
  verifyStripeAccount,
);

// Payment Link Management Routes (Admin only)
router.post(
  "/create-payment-link",
  adminAuth,
  zodValidationRequest(createPaymentWithLinkSchema),
  createPaymentWithLink,
);
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
