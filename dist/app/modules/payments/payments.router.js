"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRoutes = void 0;
const express_1 = __importDefault(require("express"));
const userAuth_1 = require("../../../middlewares/userAuth");
const zodValidationRequest_1 = __importDefault(require("../../../middlewares/zodValidationRequest"));
const payments_controller_1 = require("./payments.controller");
const payments_validation_1 = require("./payments.validation");
const router = express_1.default.Router();
// ========================================
// PAYMENT ROUTES
// ========================================
// Get payment data by Stripe session ID (more secure for payment success page)
router.get("/receipt/by-session", payments_controller_1.PaymentController.getReceiptBySessionId);
// Create payment link (User authenticated)
router.post("/create-payment-link", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(payments_validation_1.createPaymentWithLinkSchema), payments_controller_1.PaymentController.createPaymentWithLink);
// Verify payment link ownership
router.get("/verify-payment-link/:paymentLinkId", userAuth_1.userAuth, payments_controller_1.PaymentController.verifyPaymentLink);
// Get payment link details (User authenticated)
router.get("/payment-link/:paymentLinkId", userAuth_1.userAuth, (0, zodValidationRequest_1.default)(payments_validation_1.getPaymentLinkDetailsSchema), payments_controller_1.PaymentController.getPaymentLinkDetails);
// Get tenant payment status (User authenticated)
router.get("/tenant-payment-status", userAuth_1.userAuth, payments_controller_1.PaymentController.getTenantPaymentStatus);
// ========================================
// USER PAYMENT ROUTES (moved from users module)
// ========================================
// Get user's payment history
router.get("/payment-history", userAuth_1.userAuth, payments_controller_1.PaymentController.getPaymentHistory);
// Get user's rent summary
router.get("/rent-summary", userAuth_1.userAuth, payments_controller_1.PaymentController.getRentSummary);
exports.paymentRoutes = router;
