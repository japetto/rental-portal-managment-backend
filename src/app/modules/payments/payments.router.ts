import express from "express";
import { PaymentController } from "./payments.controller";

const router = express.Router();

// Get payment data by receipt number (public route for payment success page)
router.get("/receipt/:receiptNumber", PaymentController.getPaymentByReceipt);

export const paymentRoutes = router;
