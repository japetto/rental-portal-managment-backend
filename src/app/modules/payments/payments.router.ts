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

// Get payment data by receipt number (public route for payment success page)
router.get("/receipt/:receiptNumber", PaymentController.getPaymentByReceipt);

// Create payment link (User authenticated)
router.post(
  "/create-payment-link",
  userAuth,
  zodValidationRequest(createPaymentWithLinkSchema),
  PaymentController.createPaymentWithLink,
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

// Create payment link for a specific payment
router.post(
  "/:paymentId/create-payment-link",
  userAuth,
  PaymentController.createPaymentLink,
);

export const paymentRoutes = router;
