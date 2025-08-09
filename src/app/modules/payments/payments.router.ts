import express from "express";
import { userAuth } from "../../../middlewares/userAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import { PaymentController } from "./payments.controller";
import {
  createPaymentWithLinkSchema,
  getPaymentLinkDetailsSchema,
  getTenantPaymentStatusSchema,
} from "./payments.validation";

const router = express.Router();

// ========================================
// PAYMENT ROUTES
// ========================================

// Get payment data by Stripe session ID (more secure for payment success page)
router.get("/receipt/by-session", PaymentController.getReceiptBySessionId);

// Create payment link (User authenticated)
router.post(
  "/create-payment-link",
  userAuth,
  zodValidationRequest(createPaymentWithLinkSchema),
  PaymentController.createPaymentWithLink,
);

// Verify payment link ownership
router.get(
  "/verify-payment-link/:paymentLinkId",
  userAuth,
  PaymentController.verifyPaymentLink,
);

// Get payment link details (User authenticated)
router.get(
  "/payment-link/:paymentLinkId",
  userAuth,
  zodValidationRequest(getPaymentLinkDetailsSchema),
  PaymentController.getPaymentLinkDetails,
);

// Get tenant payment status (User authenticated)
router.get(
  "/tenant-payment-status/:tenantId",
  userAuth,
  zodValidationRequest(getTenantPaymentStatusSchema),
  PaymentController.getTenantPaymentStatus,
);

// ========================================
// USER PAYMENT ROUTES (moved from users module)
// ========================================

// Get user's payment history
router.get("/payment-history", userAuth, PaymentController.getPaymentHistory);

// Get user's rent summary
router.get("/rent-summary", userAuth, PaymentController.getRentSummary);

export const paymentRoutes = router;
