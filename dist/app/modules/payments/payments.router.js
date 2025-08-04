"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRoutes = void 0;
const express_1 = __importDefault(require("express"));
const payments_controller_1 = require("./payments.controller");
const router = express_1.default.Router();
// Get payment data by receipt number (public route for payment success page)
router.get("/receipt/:receiptNumber", payments_controller_1.PaymentController.getPaymentByReceipt);
exports.paymentRoutes = router;
